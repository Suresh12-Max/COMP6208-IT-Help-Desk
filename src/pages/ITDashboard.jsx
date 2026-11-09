
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const PRIORITIES = ["High", "Medium", "Low"];

const buttonStyle = {
  width: "auto",
  padding: "10px 16px",
  backgroundColor: "#214f78",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const inputStyle = {
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  backgroundColor: "white",
  minWidth: "150px",
};

function ITDashboard() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedId) || null;

  const fetchTickets = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);

    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("tickets")
        .select(
          "id, title, description, category, priority, status, resolution_notes, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setTickets(data || []);
    } catch (err) {
      setError(err.message || "Unable to load tickets.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!active) return;

        if (!user) {
          navigate("/", { replace: true });
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;
        if (!active) return;

        if (profile?.role !== "it_support") {
          navigate("/", { replace: true });
          return;
        }

        setAuthorized(true);
        await fetchTickets(true);
      } catch (err) {
        if (active) {
          setError(err.message || "Authentication failed.");
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [navigate, fetchTickets]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();

    const results = tickets.filter((ticket) => {
      const matchesSearch =
        !term ||
        ticket.title?.toLowerCase().includes(term) ||
        ticket.id?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" ||
        ticket.status?.toLowerCase() ===
          statusFilter.toLowerCase();

      const matchesPriority =
        priorityFilter === "All" ||
        ticket.priority?.toLowerCase() ===
          priorityFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });

    const priorityRank = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return results.sort((a, b) => {
      if (sortBy === "priority") {
        return (
          (priorityRank[a.priority?.toLowerCase()] ?? 3) -
          (priorityRank[b.priority?.toLowerCase()] ?? 3)
        );
      }

      const first = new Date(a.created_at).getTime() || 0;
      const second = new Date(b.created_at).getTime() || 0;

      return sortBy === "oldest"
        ? first - second
        : second - first;
    });
  }, [tickets, search, statusFilter, priorityFilter, sortBy]);

  const countStatus = (status) =>
    tickets.filter(
      (ticket) =>
        ticket.status?.toLowerCase() === status.toLowerCase()
    ).length;

  const updateTicketStatus = async (ticketId, newStatus) => {
    setUpdatingId(ticketId);
    setError("");
    setSuccess("");

    try {
      const { data, error: updateError } = await supabase
        .from("tickets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select()
        .single();

      if (updateError) throw updateError;

      setTickets((previous) =>
        previous.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, ...data }
            : ticket
        )
      );

      setSuccess("Ticket status updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openTicketDetails = (ticket) => {
    setSelectedId(ticket.id);
    setResolutionNotes(ticket.resolution_notes || "");
    setError("");
    setSuccess("");
  };

  const saveResolutionNotes = async () => {
    if (!selectedTicket) return;

    setSavingNotes(true);
    setError("");
    setSuccess("");

    try {
      const { data, error: saveError } = await supabase
        .from("tickets")
        .update({
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id)
        .select()
        .single();

      if (saveError) throw saveError;

      setTickets((previous) =>
        previous.map((ticket) =>
          ticket.id === data.id
            ? { ...ticket, ...data }
            : ticket
        )
      );

      setResolutionNotes(data.resolution_notes || "");
      setSuccess("Resolution notes saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleLogout = async () => {
    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    navigate("/", { replace: true });
  };

  if (!authorized) {
    return (
      <div className="dashboard-page" style={{ padding: 30 }}>
        {error ? (
          <div>
            <p style={{ color: "red" }}>{error}</p>
            <button onClick={() => navigate("/")}>
              Return to Login
            </button>
          </div>
        ) : (
          <p>Checking IT Support access...</p>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>IT Support Dashboard</h1>
          <p>Manage employee support requests</p>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="stats-container">
        {STATUSES.map((status) => (
          <div className="stat-card" key={status}>
            <h2>{countStatus(status)}</h2>
            <p>
              {status === "Open"
                ? "Open Tickets"
                : status === "In Progress"
                ? "In Progress"
                : status}
            </p>
          </div>
        ))}
      </div>

      <div className="ticket-table-container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 15,
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0 }}>Support Tickets</h2>

          <button
            type="button"
            style={buttonStyle}
            disabled={refreshing || loading}
            onClick={() => fetchTickets(false)}
          >
            {refreshing ? "Refreshing..." : "Refresh Tickets"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <input
            type="search"
            placeholder="Search title or ticket ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 220px" }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={inputStyle}
            aria-label="Filter by status"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={inputStyle}
            aria-label="Filter by priority"
          >
            <option value="All">All Priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={inputStyle}
            aria-label="Sort tickets"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Highest Priority</option>
          </select>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
              setPriorityFilter("All");
              setSortBy("newest");
            }}
          >
            Clear Filters
          </button>
        </div>

        <p style={{ color: "#64748b", marginBottom: 15 }}>
          Showing {filteredTickets.length} of {tickets.length} tickets
        </p>

        {error && (
          <p role="alert" style={{ color: "red" }}>{error}</p>
        )}

        {success && (
          <p role="status" style={{ color: "green" }}>{success}</p>
        )}

        <div style={{ overflowX: "auto" }}>
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading tickets...</td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-message">
                    No matching tickets found.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td title={ticket.id}>
                      {ticket.id.slice(0, 8)}
                    </td>

                    <td>{ticket.title}</td>
                    <td>{ticket.category}</td>
                    <td>{ticket.priority}</td>

                    <td>
                      <select
                        value={ticket.status || "Open"}
                        disabled={updatingId === ticket.id}
                        onChange={(e) =>
                          updateTicketStatus(
                            ticket.id,
                            e.target.value
                          )
                        }
                        style={inputStyle}
                        aria-label={`Status for ${ticket.title}`}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => openTicketDetails(ticket)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
        <div
          className="ticket-table-container"
          style={{ marginTop: 24 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <h2>Ticket Details</h2>

            <button
              type="button"
              style={{
                ...buttonStyle,
                backgroundColor: "#64748b",
              }}
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
          </div>

          <h3>{selectedTicket.title}</h3>

          <p>
            <strong>Ticket ID:</strong> {selectedTicket.id}
          </p>

          <p>
            <strong>Category:</strong> {selectedTicket.category}
          </p>

          <p>
            <strong>Priority:</strong> {selectedTicket.priority}
          </p>

          <p>
            <strong>Status:</strong> {selectedTicket.status}
          </p>

          <h3 style={{ marginTop: 20 }}>
            Problem Description
          </h3>

          <p style={{ whiteSpace: "pre-wrap" }}>
            {selectedTicket.description ||
              "No description provided."}
          </p>

          <h3 style={{ marginTop: 20 }}>
            IT Support Resolution Notes
          </h3>

          <textarea
            value={resolutionNotes}
            onChange={(e) =>
              setResolutionNotes(e.target.value)
            }
            rows={5}
            placeholder="Enter troubleshooting steps or resolution notes..."
            style={{
              width: "100%",
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 6,
              boxSizing: "border-box",
            }}
          />

          <button
            type="button"
            style={{ ...buttonStyle, marginTop: 12 }}
            disabled={savingNotes}
            onClick={saveResolutionNotes}
          >
            {savingNotes
              ? "Saving..."
              : "Save Resolution Notes"}
          </button>
        </div>
      )}
    </div>
  );
}

export default ITDashboard;
