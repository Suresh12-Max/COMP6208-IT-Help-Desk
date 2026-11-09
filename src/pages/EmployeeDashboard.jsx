
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function EmployeeDashboard() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchTickets = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      const { data, error: ticketError } = await supabase
        .from("tickets")
        .select(
          "id, title, description, category, priority, status, resolution_notes, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ticketError) throw ticketError;

      setTickets(data || []);

      setSelectedTicket((previous) => {
        if (!previous) return null;
        return data?.find((t) => t.id === previous.id) || null;
      });
    } catch (err) {
      setError(err.message || "Unable to load tickets.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        navigate("/", { replace: true });
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (!active) return;

      if (profileError || profile?.role !== "employee") {
        navigate("/", { replace: true });
        return;
      }

      await fetchTickets();
    };

    initialize();

    return () => {
      active = false;
    };
  }, [fetchTickets, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTickets(false);
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "#2563eb";
      case "in progress":
        return "#d97706";
      case "resolved":
        return "#16a34a";
      case "closed":
        return "#64748b";
      default:
        return "#64748b";
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Employee Dashboard</h1>
          <p>Welcome to the IT Help Desk</p>
        </div>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-card">
          <h2>Create Support Ticket</h2>

          <p>
            Report a hardware, software, network,
            or account problem.
          </p>

          <button
            className="primary-btn"
            onClick={() => navigate("/create-ticket")}
          >
            Create Ticket
          </button>
        </div>

        <div className="dashboard-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "15px",
            }}
          >
            <h2 style={{ margin: 0 }}>My Tickets</h2>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              style={{
                backgroundColor: "#214f78",
                color: "white",
                padding: "8px 14px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                width: "auto",
              }}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <p style={{ color: "red" }}>{error}</p>
          )}

          {loading ? (
            <p>Loading your tickets...</p>
          ) : tickets.length === 0 ? (
            <p>
              You have not submitted any support tickets yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className="ticket-table"
                style={{ width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <strong>{ticket.title}</strong>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "5px",
                          }}
                        >
                          ID: {ticket.id.slice(0, 8)}
                        </div>
                      </td>

                      <td>{ticket.category}</td>
                      <td>{ticket.priority}</td>

                      <td>
                        <span
                          style={{
                            color: "white",
                            backgroundColor:
                              getStatusColor(ticket.status),
                            padding: "6px 10px",
                            borderRadius: "6px",
                            display: "inline-block",
                            fontSize: "13px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ticket.status || "Unknown"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTicket(ticket)
                          }
                          style={{
                            backgroundColor: "#214f78",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            width: "auto",
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedTicket && (
        <div
          className="ticket-table-container"
          style={{ margin: "30px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>My Ticket Details</h2>

            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              style={{
                width: "auto",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <h3>{selectedTicket.title}</h3>

          <p>
            <strong>Ticket ID:</strong>{" "}
            {selectedTicket.id}
          </p>

          <p>
            <strong>Category:</strong>{" "}
            {selectedTicket.category}
          </p>

          <p>
            <strong>Priority:</strong>{" "}
            {selectedTicket.priority}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            <span
              style={{
                color: getStatusColor(
                  selectedTicket.status
                ),
                fontWeight: "bold",
              }}
            >
              {selectedTicket.status}
            </span>
          </p>

          <h3>Problem Description</h3>
          <p>
            {selectedTicket.description ||
              "No description available."}
          </p>

          <h3>IT Support Resolution Notes</h3>

          <div
            style={{
              backgroundColor: "#f1f5f9",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {selectedTicket.resolution_notes ||
              "IT Support has not added any resolution notes yet."}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDashboard;
