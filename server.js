// Pilot backend for the AI calling agent — using ElevenLabs Conversational AI
// Fill in .env (see .env.example) before running.
//
// How it fits together:
// 1. Website calls POST /api/calls/trigger -> this server tells ElevenLabs to call the lead
// 2. When the call ends, ElevenLabs sends the recording + transcript to our webhook
// 3. We save everything to our own Postgres database
// 4. Website calls GET /api/calls -> reads from our database (not from ElevenLabs)

require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID; // set this once you have a number

// ---- 1. Trigger an outbound call to a lead ----
app.post("/api/calls/trigger", async (req, res) => {
  const { leadId } = req.body;

  const { rows } = await pool.query("SELECT * FROM leads WHERE id = $1", [leadId]);
  const lead = rows[0];
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  try {
    // ElevenLabs Conversational AI outbound call endpoint
    const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: ELEVENLABS_AGENT_ID,
        agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
        to_number: lead.phone,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to start call", details: data });
    }

    await pool.query(
      `INSERT INTO calls (lead_id, elevenlabs_conversation_id, started_at) VALUES ($1, $2, NOW())`,
      [lead.id, data.conversation_id || null]
    );

    res.json({ status: "calling", conversationId: data.conversation_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong triggering the call" });
  }
});

// ---- 2. Webhook: ElevenLabs posts here once the call ends ----
// Configure this URL in ElevenLabs agent settings under "Webhooks" / "Post-call webhook"
app.post("/webhooks/elevenlabs/call-complete", async (req, res) => {
  const { conversation_id, transcript, recording_url, duration_seconds, analysis } = req.body;

  // "analysis" is where you can later plug in the qualified/callback/not_interested outcome
  // if you set up an OpenAI summarization step, or ElevenLabs' own built-in analysis.

  await pool.query(
    `UPDATE calls
     SET transcript = $1, recording_url = $2, duration_seconds = $3, outcome = $4, ended_at = NOW()
     WHERE elevenlabs_conversation_id = $5`,
    [
      JSON.stringify(transcript || []),
      recording_url || null,
      duration_seconds || null,
      analysis?.outcome || null,
      conversation_id,
    ]
  );

  res.sendStatus(200);
});

// ---- 3. Fetch calls for the dashboard ----
app.get("/api/calls", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT calls.*, leads.name AS lead_name, leads.phone, leads.property
     FROM calls JOIN leads ON calls.lead_id = leads.id
     ORDER BY calls.created_at DESC`
  );
  res.json(rows);
});

// ---- 4. Add a new lead ----
app.post("/api/leads", async (req, res) => {
  const { name, phone, property } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO leads (name, phone, property) VALUES ($1, $2, $3) RETURNING *`,
    [name, phone, property]
  );
  res.json(rows[0]);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
