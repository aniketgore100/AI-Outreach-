function toGmailConnectionDto(connection) {
  return {
    id: connection._id.toString(),
    email: connection.email,
    status: connection.status,
    connectedAt: connection.connectedAt,
    disconnectedAt: connection.disconnectedAt,
  };
}

module.exports = { toGmailConnectionDto };
