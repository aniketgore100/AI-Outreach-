function toUserResponseDto(user) {
  return {
    id: user._id.toString(),
    companyName: user.companyName,
    email: user.email,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = { toUserResponseDto };
