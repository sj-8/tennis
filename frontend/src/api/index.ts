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

    // Validate path
    const path = options.url.startsWith('/') ? options.url : `/${options.url}`;
    if (!/^[a-zA-Z0-9\/\-_]+$/.test(path)) {
       return reject({ code: 'INVALID_PATH_FORMAT', message: '请求路径包含非法字符' });
    }

    const fullPath = path.startsWith('/api') ? path : `/api${path}`;
    
    console.log(`[API] Request: ${options.method || 'GET'} ${fullPath}`, { data: options.data });

    // #ifdef MP-WEIXIN
    wx.cloud.callContainer({
      config: {
        env: 'prod-8g8j609ye88db758' // User provided env ID
      },
      path: fullPath, 
      header: {
        ...header,
        'X-WX-SERVICE': 'express-4y4r' // Restore service name to ensure correct routing
      },
      method: options.method || 'GET',
      data: options.data || {}, // Ensure data is not undefined
      success: (res: any) => {
        // wx.cloud.callContainer returns { data: ..., statusCode: ... }
        // Our backend returns the data directly in body
        if (res.statusCode >= 200 && res.statusCode < 300) {
           resolve(res.data);
        } else {
           console.error(`[API] Error ${res.statusCode}:`, res.data);
           reject(res.data || 'Request failed');
        }
      },
      fail: (err: any) => {
        console.error('[API] CallContainer Fail:', err);
        // Enhance error message for INVALID_PATH
        if (err?.error === 'INVALID_PATH' || (err?.message && err.message.includes('INVALID_PATH'))) {
            console.error('API Path Error: Please check if the service is running and the path is correct in CloudBase console.');
        }
        // Enhance 404 error message
        if (err?.statusCode === 404 || err?.message?.includes('404')) {
            console.error('API 404 Not Found: 接口端点不存在或路径错误。请检查 backend/src/routes/index.ts 是否已包含该路由，并确认后端已重新部署。');
        }
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
// 用户报名记录
export const getUserApplications = () => request({ url: '/application/my' });
// 取消报名
export const cancelApplication = (matchId: number) => request({ url: `/application/${matchId}/cancel`, method: 'POST' });
// 更新个人信息
export const updateProfile = (id: number, data: any) => request({ url: `/auth/${id}/profile`, method: 'PUT', data });
// 更新赛事信息
export const updateMatch = (id: number, data: any) => request({ url: `/matches/${id}`, method: 'PUT', data });
// 删除赛事
export const deleteMatch = (id: number) => request({ url: `/matches/${id}`, method: 'DELETE' });

// 裁判员管理
export const getReferees = (matchId: number) => request({ url: `/matches/${matchId}/referees` });
export const addReferee = (matchId: number, openid: string) => request({ url: `/matches/${matchId}/referees`, method: 'POST', data: { openid } });
export const removeReferee = (matchId: number, playerId: number) => request({ url: `/matches/${matchId}/referees/${playerId}`, method: 'DELETE' });

// 比赛对战管理 (Game/Draw)
export const getGames = (tournamentId: number) => request({ url: `/matches/${tournamentId}/games` });
export const createGame = (tournamentId: number, data: any) => request({ url: `/matches/${tournamentId}/games`, method: 'POST', data });
export const updateGameScore = (gameId: number, data: any) => request({ url: `/games/${gameId}/score`, method: 'PUT', data });
