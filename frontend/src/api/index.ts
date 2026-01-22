const BASE_URL = 'https://express-4y4r-199217-5-1386469492.sh.run.tcloudbase.com/api';

// Declare wx global for TypeScript
declare const wx: any;

const handleLoginError = () => {
  // Clear session to force re-login state
  uni.removeStorageSync('userInfo');
  uni.removeStorageSync('token');
  
  uni.showModal({
    title: '未登录或会话过期',
    content: '请重新登录以获取权限',
    showCancel: false,
    confirmText: '去登录',
    success: (res: any) => {
      if (res.confirm) {
        uni.switchTab({ url: '/pages/my/my' });
      }
    }
  });
};

export const request = (options: any) => {
  /**
   * 封装请求方法
   * - 微信小程序环境：使用 wx.cloud.callContainer
   * - 其他环境：使用 uni.request
   */
  const showToast = options.showToast !== false; // Default to true

  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    const header: any = {
      'Content-Type': 'application/json',
      ...options.header
    };
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    const urlWithQuery = options.url.startsWith('/') ? options.url : `/${options.url}`;
    const fullPath = urlWithQuery.startsWith('/api') ? urlWithQuery : `/api${urlWithQuery}`;
    
    console.log(`[API] Request: ${options.method || 'GET'} ${fullPath}`, { data: options.data });

    const handleError = (err: any) => {
      const msg = err.message || err.error || '请求失败';
      if (showToast) {
        uni.showToast({ title: msg, icon: 'none', duration: 3000 });
      }
      reject(err);
    };

    const attemptRequest = (retryCount = 0) => {
      // #ifdef MP-WEIXIN
      wx.cloud.callContainer({
        config: {
          env: 'prod-8g8j609ye88db758',
          timeout: 15000 // Max allowed by WeChat is 15s
        },
        path: fullPath, 
        header: {
          ...header,
          'X-WX-SERVICE': 'express-4y4r'
        },
        method: options.method || 'GET',
        data: options.data || {},
        success: (res: any) => {
          if (res.statusCode === 401 || res.statusCode === 403) {
             handleLoginError();
             reject(res.data || 'Unauthorized/Forbidden');
             return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
             resolve(res.data);
          } else {
             console.error(`[API] Error ${res.statusCode}:`, res.data);
             handleError({ message: (res.data && res.data.error) || `请求失败 (${res.statusCode})` });
          }
        },
        fail: (err: any) => {
          console.error('[API] CallContainer Fail:', err);
          
          // Retry logic for Timeout (102002) or System Error (-1) which might be cold start related
          const isTimeout = err?.errCode === 102002 || (err?.errMsg && err.errMsg.includes('timeout')) || (err?.errMsg && err.errMsg.includes('请求超时'));
          const isSystemError = err?.errCode === -1; // Sometimes cold start returns -1
          
          if ((isTimeout || isSystemError) && retryCount < 2) {
             console.log(`[API] Request failed (Code: ${err?.errCode}), retrying... (${retryCount + 1}/2)`);
             setTimeout(() => {
                 attemptRequest(retryCount + 1);
             }, 500);
             return;
          }

          if (err?.error === 'INVALID_PATH' || (err?.message && err.message.includes('INVALID_PATH'))) {
              err.message = 'API路径配置错误，请检查云托管状态';
          }
          if (err?.statusCode === 404 || err?.message?.includes('404')) {
              err.message = '接口不存在或服务未启动';
          }
          handleError(err);
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            handleError({ message: res.data.error || `请求失败 ${res.statusCode}` });
          }
        },
        fail: (err: any) => {
          handleError(err);
        }
      });
      // #endif
    };

    attemptRequest();
  });
};

// 获取赛事列表
export const getMatches = (params: any = {}) => request({ url: '/matches/list', method: 'POST', data: params });
// 创建赛事
export const createMatch = (data: any) => request({ url: '/matches', method: 'POST', data });
// 获取排行榜
export const getRankings = (params: any = {}) => {
  // Convert params to body data for POST
  // Remove complex logic from here, let controller handle it or pass as is
  // Need to ensure backend can handle '全部' logic if we pass it directly
  return request({ url: '/matches/rankings-list', method: 'POST', data: params });
};
// 提交比赛结果
export const submitResult = (id: number, results: any) => request({ url: `/matches/${id}/results`, method: 'POST', data: { results } });
// 提交报名申请
export const submitApplication = (data: any) => request({ url: '/application/submit', method: 'POST', data });
// 获取赛事参赛人员
export const getMatchParticipants = (id: number) => request({ url: `/matches/${id}/participants` });
// 用户报名记录
export const getUserApplications = () => request({ url: '/application/my' });
// 取消报名
export const cancelApplication = (matchId: number) => request({ url: `/application/${matchId}/cancel`, method: 'POST' });
// 更新个人信息
export const updateProfile = (id: number, data: any) => request({ url: `/auth/${id}/profile`, method: 'PUT', data });
// 搜索用户
export const searchPlayers = (query: string) => request({ url: `/users/search?query=${encodeURIComponent(query)}` });
// 获取手机号
export const getWeChatPhone = (code: string) => request({ url: '/auth/phone', method: 'POST', data: { code } });
// 更新赛事信息
export const updateMatch = (id: number, data: any) => request({ url: `/matches/${id}`, method: 'PUT', data });
// 删除赛事
export const deleteMatch = (id: number) => request({ url: `/matches/${id}`, method: 'DELETE' });

// 裁判员管理
export const getReferees = (matchId: number) => request({ url: `/matches/${matchId}/referees` });
export const addReferee = (matchId: number, identifier: string) => {
    // Check if identifier looks like ID Card (18 digits) or OpenID
    const data: any = {};
    if (/^\d{17}[\dXx]$/.test(identifier)) {
        data.idCard = identifier;
    } else {
        data.openid = identifier;
    }
    return request({ url: `/matches/${matchId}/referees`, method: 'POST', data });
};
export const removeReferee = (matchId: number, playerId: number) => request({ url: `/matches/${matchId}/referees/${playerId}`, method: 'DELETE' });

// 比赛对战管理 (Game/Draw)
export const getGames = (tournamentId: number) => request({ url: `/matches/${tournamentId}/games` });
export const createGame = (tournamentId: number, data: any) => request({ url: `/matches/${tournamentId}/games`, method: 'POST', data });
export const updateGameScore = (gameId: number, data: any) => request({ url: `/games/${gameId}/score`, method: 'PUT', data });

// 比赛分组管理
export const getGroups = (tournamentId: number) => request({ url: `/matches/${tournamentId}/groups` });
export const createGroup = (tournamentId: number, title: string) => request({ url: `/matches/${tournamentId}/groups`, method: 'POST', data: { title } });
export const updateGroup = (groupId: number, title: string) => request({ url: `/groups/${groupId}`, method: 'PUT', data: { title } });
export const deleteGroup = (groupId: number) => request({ url: `/groups/${groupId}`, method: 'DELETE' });
