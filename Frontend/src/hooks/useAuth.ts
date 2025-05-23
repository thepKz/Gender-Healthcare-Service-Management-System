import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { getProfile, login, logout, register } from '../redux/slices/authSlice';
import { User } from '../types';

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  gender: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface UseAuthResult {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  handleLogin: (params: LoginParams) => Promise<AuthResult>;
  handleRegister: (params: RegisterParams) => Promise<AuthResult>;
  handleLogout: () => Promise<AuthResult>;
  fetchProfile: () => Promise<AuthResult>;
}

/**
 * Custom hook để xử lý xác thực người dùng
 */
const useAuth = (): UseAuthResult => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error } = useAppSelector((state) => state.auth);
  const checkAuthAttemptRef = useRef(false);

  /**
   * Kiểm tra trạng thái đăng nhập khi ứng dụng khởi động
   */
  useEffect(() => {
    // Kiểm tra xem có cookie access_token không trước khi gọi API
    const hasCookies = document.cookie.split(';').some(c => c.trim().startsWith('access_token='));
    
    const checkAuth = async () => {
      // Đánh dấu đã thử, để tránh retry liên tục khi lỗi
      checkAuthAttemptRef.current = true;
      
      // Chỉ thực hiện kiểm tra nếu có cookie
      if (hasCookies) {
        try {
          // Gọi API để kiểm tra cookie và lấy thông tin user
          await dispatch(getProfile()).unwrap();
          
          // Chỉ log thành công trong môi trường dev
          if (import.meta.env.DEV) {
            console.log("Đã xác thực thành công");
          }
        } catch {
          // Không cần log lỗi khi chưa đăng nhập - đây là trạng thái bình thường
          // if (import.meta.env.DEV) console.log('Chưa đăng nhập hoặc phiên đã hết hạn');
        }
      }
    };

    // Chỉ gọi khi chưa thử trước đó
    if (!checkAuthAttemptRef.current) {
      checkAuth();
    }
  }, [dispatch]);

  /**
   * Lấy thông tin người dùng
   */
  const fetchProfile = useCallback(async (): Promise<AuthResult> => {
    try {
      const userData = await dispatch(getProfile()).unwrap();
      return { success: true, user: userData };
    } catch (error) {
      if (typeof error === 'string') {
        return { success: false, error };
      }
      return { success: false, error: 'Lấy thông tin người dùng thất bại.' };
    }
  }, [dispatch]);

  /**
   * Xử lý đăng nhập
   */
  const handleLogin = useCallback(
    async (params: LoginParams): Promise<AuthResult> => {
      try {
        // Gọi API đăng nhập để lấy access_token
        const result = await dispatch(login(params)).unwrap();
        return { success: true, user: result.user };
      } catch (error) {
        if (typeof error === 'string') {
          return { success: false, error };
        }
        return { success: false, error: 'Đăng nhập thất bại. Vui lòng thử lại sau.' };
      }
    },
    [dispatch]
  );

  /**
   * Xử lý đăng ký
   */
  const handleRegister = useCallback(
    async (params: RegisterParams): Promise<AuthResult> => {
      try {
        const result = await dispatch(register(params)).unwrap();
        return { success: true, user: result.user };
      } catch (error) {
        if (typeof error === 'string') {
          return { success: false, error };
        }
        return { success: false, error: 'Đăng ký thất bại. Vui lòng thử lại sau.' };
      }
    },
    [dispatch]
  );

  /**
   * Xử lý đăng xuất
   */
  const handleLogout = useCallback(async (): Promise<AuthResult> => {
    try {
      await dispatch(logout()).unwrap();
      return { success: true };
    } catch (error) {
      if (typeof error === 'string') {
        return { success: false, error };
      }
      return { success: false, error: 'Đăng xuất thất bại. Vui lòng thử lại sau.' };
    }
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
    fetchProfile,
  };
};

export { useAuth };
export default useAuth; 