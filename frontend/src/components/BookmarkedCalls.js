// src/components/BookmarkedCalls.js
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, Container } from "react-bootstrap";

function BookmarkedCalls() {
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    setBookmarks(stored);
  }, []);

  const removeBookmark = (id) => {
    const updated = bookmarks.filter((item) => item.id !== id);
    localStorage.setItem("bookmarkedCalls", JSON.stringify(updated));
    setBookmarks(updated);
  };

  return (
    <Container className="mt-4">
      <h2>📘 Bookmarked Calls</h2>
      {bookmarks.length === 0 ? (
        <p>You have no bookmarked calls.</p>
      ) : (
        bookmarks.map((call) => (
          <Card key={call.id} className="mb-3">
            <Card.Body>
              <Card.Title>{call.name}</Card.Title>
              <Card.Text>
                <strong>Call ID:</strong> {call.id}
              </Card.Text>
              <Link to={`/node/${encodeURIComponent(call.id)}`}>
                <Button variant="primary" className="me-2">
                  View Details
                </Button>
              </Link>
              <Button variant="danger" onClick={() => removeBookmark(call.id)}>
                Remove
              </Button>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
  );
}

export default BookmarkedCalls;
