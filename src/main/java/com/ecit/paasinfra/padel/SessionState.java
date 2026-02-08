package com.ecit.paasinfra.padel;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SessionState {
  private String sessionId;
  private List<String> players;
  private Map<String, List<String>> availability;

  public SessionState() {
    this.availability = new HashMap<>();
  }

  public SessionState(String sessionId, List<String> players) {
    this.sessionId = sessionId;
    this.players = players;
    this.availability = new HashMap<>();
  }

  public String getSessionId() {
    return sessionId;
  }

  public void setSessionId(String sessionId) {
    this.sessionId = sessionId;
  }

  public List<String> getPlayers() {
    return players;
  }

  public void setPlayers(List<String> players) {
    this.players = players;
  }

  public Map<String, List<String>> getAvailability() {
    return availability;
  }

  public void setAvailability(Map<String, List<String>> availability) {
    this.availability = availability;
  }
}
