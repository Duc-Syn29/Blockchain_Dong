// Hàm checkRole nhận vào một danh sách các role được phép (dạng rest parameter)
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Kiểm tra xem người dùng đã được xác thực qua auth.middleware chưa
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Không thể xác thực quyền truy cập." });
    }

    // 2. Kiểm tra xem role của người dùng có nằm trong danh sách cho phép không
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Truy cập bị từ chối. Chỉ các vai trò [${allowedRoles.join(", ")}] mới được phép thực hiện hành động này.` 
      });
    }

    // Nếu hợp lệ, cho phép đi tiếp đến Controller
    next();
  };
};

module.exports = checkRole;