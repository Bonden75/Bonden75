package com.ecit.paasinfra.padel;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/api/session")
public class SessionServlet extends HttpServlet {
  private static final String STORE_KEY = "padelSessionStore";
  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    String sessionId = request.getParameter("session");
    if (sessionId == null || sessionId.isBlank()) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing session");
      return;
    }
    SessionState state = getStore(request.getServletContext())
        .computeIfAbsent(sessionId, this::createDefaultState);
    response.setContentType("application/json");
    MAPPER.writeValue(response.getWriter(), state);
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    SessionState incoming = MAPPER.readValue(request.getInputStream(), SessionState.class);
    if (incoming.getSessionId() == null || incoming.getSessionId().isBlank()) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing sessionId");
      return;
    }
    if (incoming.getPlayers() == null) {
      incoming.setPlayers(defaultPlayers());
    }
    if (incoming.getAvailability() == null) {
      incoming.setAvailability(new ConcurrentHashMap<>());
    }
    getStore(request.getServletContext()).put(incoming.getSessionId(), incoming);
    response.setContentType("application/json");
    MAPPER.writeValue(response.getWriter(), incoming);
  }

  private Map<String, SessionState> getStore(ServletContext context) {
    @SuppressWarnings("unchecked")
    Map<String, SessionState> store = (Map<String, SessionState>) context.getAttribute(STORE_KEY);
    if (store == null) {
      store = new ConcurrentHashMap<>();
      context.setAttribute(STORE_KEY, store);
    }
    return store;
  }

  private SessionState createDefaultState(String sessionId) {
    return new SessionState(sessionId, defaultPlayers());
  }

  private List<String> defaultPlayers() {
    return Arrays.asList("", "", "", "");
  }
}
