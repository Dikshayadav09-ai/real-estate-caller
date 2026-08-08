```jsx
import React, { useState, useEffect } from "react";

// Change this if your Railway URL ever changes
const API_BASE_URL = "https://honest-mercy-production-4c55.up.railway.app";

export default function CallDashboard() {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCalls();
  }, []);

  async function fetchCalls() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/calls`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.calls || [];
      setCalls(list);
      if (list.length > 0) {
        setSelectedCall(list[0]);
      }
    } catch (err) {
      setError(
        "Calls load nahi ho paye. Backend chal raha hai ya nahi check karein: " +
          err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function statusBadge(status) {
    const s = (status || "unknown").toLowerCase();
    const styles = {
      completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      "in-progress": "bg-amber-50 text-amber-700 border-amber-200",
      in_progress: "bg-amber-50 text-amber-700 border-amber-200",
      failed: "bg-red-50 text-red-700 border-red-200",
      unknown: "bg-slate-100 text-slate-600 border-slate-200",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
          styles[s] || styles.unknown
        }`}
      >
        {status || "Unknown"}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Real Estate Calling Agent
          </h1>
          <p className="text-sm text-slate-500">Call log & recordings dashboard</p>
        </div>
        <button
          onClick={fetchCalls}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Call list */}
        <aside className="w-80 border-r border-slate-200 bg-white overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-slate-500">Loading calls…</div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-600 leading-relaxed">
              {error}
            </div>
          )}

          {!loading && !error && calls.length === 0 && (
            <div className="p-4 text-sm text-slate-500 leading-relaxed">
              Abhi tak koi call record nahi hai. Jaise hi ek call complete
              hogi aur webhook se save hogi, yahan dikhegi.
            </div>
          )}

          {!loading &&
            !error &&
            calls.map((call) => {
              const isSelected = selectedCall && selectedCall.id === call.id;
              return (
                <button
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    isSelected ? "bg-slate-50 border-l-2 border-l-slate-900" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                      {call.lead_name || call.phone_number || "Unknown lead"}
                    </span>
                    {statusBadge(call.status)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(call.created_at || call.call_time)}
                  </div>
                </button>
              );
            })}
        </aside>

        {/* Detail panel */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedCall ? (
            <div className="text-sm text-slate-400 mt-10 text-center">
              Ek call select karein details dekhne ke liye.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedCall.lead_name || selectedCall.phone_number || "Call detail"}
                </h2>
                <div className="text-sm text-slate-500 mt-1">
                  {formatDate(selectedCall.created_at || selectedCall.call_time)} ·{" "}
                  {selectedCall.phone_number || "No number"}
                </div>
                <div className="mt-2">{statusBadge(selectedCall.status)}</div>
              </div>

              {/* Recording player */}
              <section className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Recording
                </h3>
                {selectedCall.recording_url ? (
                  <audio
                    controls
                    className="w-full"
                    src={selectedCall.recording_url}
                  >
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <p className="text-sm text-slate-400">
                    Recording abhi available nahi hai.
                  </p>
                )}
              </section>

              {/* Extracted info, if backend provides it */}
              {(selectedCall.total_flats ||
                selectedCall.availability ||
                selectedCall.amenities ||
                selectedCall.pricing) && (
                <section className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Extracted Info
                  </h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {selectedCall.total_flats && (
                      <>
                        <dt className="text-slate-500">Total flats</dt>
                        <dd>{selectedCall.total_flats}</dd>
                      </>
                    )}
                    {selectedCall.availability && (
                      <>
                        <dt className="text-slate-500">Availability</dt>
                        <dd>{selectedCall.availability}</dd>
                      </>
                    )}
                    {selectedCall.amenities && (
                      <>
                        <dt className="text-slate-500">Amenities</dt>
                        <dd>{selectedCall.amenities}</dd>
                      </>
                    )}
                    {selectedCall.pricing && (
                      <>
                        <dt className="text-slate-500">Pricing</dt>
                        <dd>{selectedCall.pricing}</dd>
                      </>
                    )}
                  </dl>
                </section>
              )}

              {/* Transcript */}
              <section className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Transcript
                </h3>
                {selectedCall.transcript ? (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {typeof selectedCall.transcript === "string"
                      ? selectedCall.transcript
                      : JSON.stringify(selectedCall.transcript, null, 2)}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Transcript abhi available nahi hai.
                  </p>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

