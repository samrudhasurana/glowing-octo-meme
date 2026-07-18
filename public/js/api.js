const api = {
  async _req(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        const data = await res.json();
        if (data.error) message = data.error;
      } catch (_) {}
      throw new Error(message);
    }
    if (res.status === 204) return null;
    return res.json();
  },

  getDecks: () => api._req("GET", "/api/decks"),
  createDeck: (payload) => api._req("POST", "/api/decks", payload),
  getDeck: (id) => api._req("GET", `/api/decks/${id}`),
  updateDeck: (id, payload) => api._req("PUT", `/api/decks/${id}`, payload),
  deleteDeck: (id) => api._req("DELETE", `/api/decks/${id}`),

  addCard: (deckId, payload) => api._req("POST", `/api/decks/${deckId}/cards`, payload),
  updateCard: (id, payload) => api._req("PUT", `/api/cards/${id}`, payload),
  deleteCard: (id) => api._req("DELETE", `/api/cards/${id}`),

  getStudyQueue: (deckId) => api._req("GET", `/api/decks/${deckId}/study`),
  reviewCard: (cardId, rating) => api._req("POST", `/api/cards/${cardId}/review`, { rating }),

  getQuiz: (deckId) => api._req("GET", `/api/decks/${deckId}/quiz`),

  importCards: (deckId, cards) => api._req("POST", `/api/decks/${deckId}/import`, { cards }),
};
