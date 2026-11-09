
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function CreateTicket() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Please log in first.");
      }

      const { error: insertError } = await supabase
        .from("tickets")
        .insert({
          user_id: user.id,
          title: title.trim(),
          category,
          priority,
          description: description.trim(),
          status: "Open",
        });

      if (insertError) throw insertError;

      alert("Ticket submitted successfully!");

      setTitle("");
      setCategory("");
      setPriority("");
      setDescription("");

      navigate("/employee-dashboard");
    } catch (err) {
      setError(err.message || "Unable to submit ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ticket-page">
      <div className="ticket-container">
        <div className="ticket-header">
          <h1>Create Support Ticket</h1>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/employee-dashboard")}
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ticket Title</label>
            <input
              type="text"
              placeholder="Example: Printer not working"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select category</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Network">Network</option>
              <option value="Account">Account / Access</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              required
            >
              <option value="">Select priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="6"
              placeholder="Describe the IT problem..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: "red" }}>{error}</p>
          )}

          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateTicket;
