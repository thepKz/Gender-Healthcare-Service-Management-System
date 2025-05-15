import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { OtpCode, User } from "../models";
import {
  sendPasswordChangeAlert,
  sendResetPasswordEmail,
} from "../services/emails";
import { AuthRequest } from "../types";

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Không tìm thấy ID người dùng" });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const formattedProfile = {
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive
    };
    return res.status(200).json({ data: formattedProfile });
  } catch (error: any) {
    console.log("Error in getUser:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi xử lý yêu cầu",
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const {
      fullName,
      phone,
      avatar,
    } = req.body;

    const userUpdateData: any = {
      phone,
      avatar,
    };

    if (fullName) {
      userUpdateData.fullName = fullName;
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      userUpdateData,
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(500)
        .json({ message: "Có lỗi xảy ra khi cập nhật thông tin" });
    }

    const formattedUser = {
      id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      phone: updatedUser.phone,
    };

    return res
      .status(200)
      .json({ message: "Cập nhật thành công!", data: formattedUser });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const checkEmailWithPhoneNumber = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, phone } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      const existedEmail = await User.findOne({ email });

      if (existedEmail) {
        return res.status(200).json({ exists: true });
      } else {
        return res.status(200).json({ exists: false });
      }
    } else {
      const emailCheck = await User.findOne({ email });

      if (emailCheck && emailCheck._id.toString() !== user._id.toString()) {
        return res.status(200).json({ exists: true });
      } else {
        return res.status(200).json({ exists: false });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi kiểm tra thông tin",
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "Danh sách tài khoản trống" });
    }

    const formattedData = users.map((user) => ({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar || "",
      phone: user.phone || "",
      role: user.role,
      isActive: user.isActive,
    }));

    return res.status(200).json({ data: formattedData });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      data: user,
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message:
        error.message || "Đã xảy ra lỗi khi cập nhật trạng thái tài khoản",
    });
  }
};

export const checkPhoneNumber = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    return res.status(200).json({ exists: !!user, userId: user?._id });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        message: "Mật khẩu hiện tại không đúng",
        password: "Mật khẩu hiện tại không đúng",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Gửi email cảnh báo
    await sendPasswordChangeAlert(user.email, user.fullName, newPassword);

    return res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Đã xảy ra lỗi khi đổi mật khẩu",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    // Tạo OTP cho reset password
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // HardCode
    // Tạo thời gian hết hạn (10 phút)
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 10);
    
    // Lưu OTP vào database
    await OtpCode.create({
      userId: user._id,
      type: "password_reset",
      otp,
      expires: expiryDate,
      verified: false,
      attempts: 0
    });

    await sendResetPasswordEmail(user.email, otp, user.fullName);

    return res.status(200).json({
      message: "Mã xác nhận đã được gửi đến email của bạn",
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Đã xảy ra lỗi khi gửi yêu cầu",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    // Kiểm tra OTP
    const otpRecord = await OtpCode.findOne({
      userId: user._id,
      type: "password_reset",
      otp,
      expires: { $gt: new Date() },
      verified: false
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: "Mã xác nhận không hợp lệ hoặc đã hết hạn",
      });
    }

    // Cập nhật OTP thành đã sử dụng
    otpRecord.verified = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // Cập nhật mật khẩu
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Đã xảy ra lỗi khi đặt lại mật khẩu",
    });
  }
};

// Tìm kiếm người dùng
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || "";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy as string || "createdAt";
    const sortOrder = req.query.sortOrder as string || "desc";
    const role = req.query.role as string;
    
    // Xây dựng query tìm kiếm
    const searchQuery: any = {};
    
    // Thêm bộ lọc tìm kiếm cơ bản
    if (query) {
      searchQuery.$or = [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } }
      ];
    }
    
    // Thêm bộ lọc theo role
    if (role && ["admin", "customer", "consultant", "staff", "manager"].includes(role)) {
      searchQuery.role = role;
    }
    
    // Xác định hướng sắp xếp
    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    
    // Thực hiện tìm kiếm với bộ lọc và phân trang
    const users = await User.find(searchQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-password"); // Không trả về trường password
    
    // Đếm tổng số kết quả
    const total = await User.countDocuments(searchQuery);
    
    // Thêm thông tin meta
    const filters = {
      query: query || undefined,
      role: role || undefined,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc"
    };
    
    return res.status(200).json({
      users,
      filters,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Đã xảy ra lỗi khi tìm kiếm người dùng",
    });
  }
};
