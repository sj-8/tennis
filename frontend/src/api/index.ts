const BASE_URL = 'https://express-4y4r-199217-5-1386469492.sh.run.tcloudbase.com/api';

// Declare wx global for TypeScript
declare const wx: any;

export const request = (options: any) => {
  /**
   * 封装请求方法
   * - 微信小程序环境：使用 wx.cloud.callContainer
   * - 其他环境：使用 uni.request
   */
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    const header: any = {
      'Content-Type': 'application/json',
      ...options.header
    };
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    // #ifdef MP-WEIXIN
    // Use wx.cloud.callContainer
    // 错误分析：Cannot POST /auth/login 说明后端收到了请求，但找不到这个路由。
    // 这意味着后端确实需要 /api 前缀。
    // 我们之前的尝试（带/api）失败是因为环境 ID 错了。
    // 现在的尝试（不带/api）失败是因为路径不对。
    // 所以正确的组合是：正确的环境 ID + 带 /api 前缀的路径。
    
    const path = options.url.startsWith('/') ? options.url : `/${options.url}`;
    const fullPath = path.startsWith('/api') ? path : `/api${path}`;
    
    wx.cloud.callContainer({
      config: {
        env: 'prod-8g8j609ye88db758' // User provided env ID
      },
      path: fullPath, 
      header: {
        ...header,
        'X-WX-SERVICE': 'express-4y4r'
      },
      method: options.method || 'GET',
      data: options.data,
      success: (res: any) => {
        // wx.cloud.callContainer returns { data: ..., statusCode: ... }
        // Our backend returns the data directly in body
        if (res.statusCode >= 200 && res.statusCode < 300) {
           resolve(res.data);
        } else {
           reject(res.data || 'Request failed');
        }
      },
      fail: (err: any) => {
        reject(err);
      }
    });
    // #endif

    // #ifndef MP-WEIXIN
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res: any) => {
        resolve(res.data);
      },
      fail: (err: any) => {
        reject(err);
      }
    });
    // #endif
  });
};

// 获取赛事列表
export const getMatches = () => request({ url: '/matches' });
// 创建赛事
export const createMatch = (data: any) => request({ url: '/matches', method: 'POST', data });
// 获取排行榜
export const getRankings = () => request({ url: '/matches/rankings' });
// 提交比赛结果
export const submitResult = (id: number, results: any) => request({ url: `/matches/${id}/results`, method: 'POST', data: { results } });
// 提交报名申请
export const submitApplication = (data: any) => request({ url: '/application/submit', method: 'POST', data });
// 获取赛事参赛人员
export const getMatchParticipants = (id: number) => request({ url: `/matches/${id}/participants` });
// 更新个人信息
export const updateProfile = (id: number, data: any) => request({ url: `/auth/${id}/profile`, method: 'PUT', data });
