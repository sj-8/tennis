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
    // const path = options.url.startsWith('/') ? options.url : `/${options.url}`;
    // Relaxed validation to allow query parameters
    // if (!/^[a-zA-Z0-9\/\-_]+$/.test(path)) {
    //    return reject({ code: 'INVALID_PATH_FORMAT', message: '请求路径包含非法字符' });
    // }

    // Manually handle path to avoid issues with query params in callContainer path validation (if any)
    // Actually, callContainer 'path' usually supports query params, but sometimes stricter regex applies if we are not careful.
    // Let's use `options.url` directly but ensure it starts with /
    const urlWithQuery = options.url.startsWith('/') ? options.url : `/${options.url}`;
    
    // CloudBase `callContainer` path usually should NOT contain query params in the `path` field if using `express` routing? 
    // Wait, express routing needs the full path including query? No, express handles query separately.
    // BUT `callContainer` `path` maps to the request URL.
    // If we pass `/matches?region=...`, it should work.
    // The previous error `INVALID_PATH_FORMAT` suggests CloudBase SDK or the container gateway is rejecting it.
    // The regex `^[a-zA-Z0-9\/\-_]+$` definitely rejects `?` and `=`.
    // I already commented out the regex.
    // If the error persists, it might be coming from the SDK itself?
    // "请求路径包含非法字符" (Request path contains illegal characters) might be a local check in `wx.cloud.callContainer`?
    // Documentation says: `path` must start with `/`.
    // Some versions of SDK restrict characters.
    
    // Workaround: Pass query parameters in `header` or `data`? No, GET requests usually use query string.
    // If `callContainer` strictly forbids `?` in `path`, we might need to rely on `express` parsing `data` as query?
    // But `callContainer` documentation says `data` is request body. GET requests with body are weird but supported by some.
    // Express `req.query` usually comes from URL.
    
    // Let's try to remove query string from `path` and append it manually? No.
    // Let's try to see if we can use `uni.request` for debugging or just fix the path.
    // Actually, `wx.cloud.callContainer` supports `?` in path in newer lib versions.
    // The user env is `lib: 3.13.0`.
    
    // Alternative: Move query params to `header`? No.
    // Alternative: Use `POST` for search/filtering if GET is restricted?
    // That's a big change.
    
    // Let's try to assume the previous fix (commenting regex) didn't propagate or wasn't enough?
    // User input shows `INVALID_PATH_FORMAT` again.
    // This error comes from `wx.cloud.callContainer` client-side validation if the path contains `?` or other chars.
    
    // FIX: Split path and query string?
    // No, `callContainer` `path` is the only place for URL.
    // Wait, maybe I should use `uni.request` to cloud run URL directly?
    // `https://express-4y4r-199217-5-1386469492.sh.run.tcloudbase.com/api`
    // But that requires domain configuration in MP admin.
    
    // Best Fix: Use `POST` for `getMatches` / `getRankings` if params are complex?
    // Or try to see if we can pass query params differently.
    // Actually, checking `wx.cloud.callContainer` docs:
    // "path: 填入业务服务的路径，默认为 /，不能带查询参数（query string），查询参数请放在 header 中 X-WX-SERVICE-QUERY" ? No, that's for service calls?
    // Wait, some docs say: "Query parameters should be in the path".
    // But if validation fails...
    
    // Let's try to use `POST` for all parameterized queries to avoid this headache?
    // It's non-standard REST but effective.
    // I will change `getMatches` and `getRankings` to use POST and send params in body.
    // I need to update Backend too.
    
    // Plan:
    // 1. Update `frontend/src/api/index.ts` to use POST for `getMatches` and `getRankings`.
    // 2. Update `backend/src/routes/index.ts` to accept POST for these routes.
    // 3. Update `backend/src/controllers/matchController.ts` to read from `req.body` instead of `req.query` for these.
    
    // Let's start with this tool call, I will change `api/index.ts` to use POST for these.
    
    const fullPath = urlWithQuery.startsWith('/api') ? urlWithQuery : `/api${urlWithQuery}`;
    
    console.log(`[API] Request: ${options.method || 'GET'} ${fullPath}`, { data: options.data });

    // #ifdef MP-WEIXIN
    // 强制使用本地开发服务器进行调试
    // uni.request({
    //   url: `http://localhost:3000/api${path}`,
    //   method: options.method || 'GET',
    //   data: options.data,
    //   header,
    //   success: (res: any) => {
    //     if (res.statusCode === 401) {
    //       handleLoginError();
    //       reject(res.data);
    //       return;
    //     }
    //     resolve(res.data);
    //   },
    //   fail: (err: any) => {
    //     console.error('Local Request Fail:', err);
    //     reject(err);
    //   }
    // });
    // return; // 提前返回

    wx.cloud.callContainer({
      config: {
        env: 'prod-8g8j609ye88db758', // User provided env ID
        timeout: 15000 // Increase timeout to 15s to handle cold starts
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
        if (res.statusCode === 401 || res.statusCode === 403) {
           handleLoginError();
           reject(res.data || 'Unauthorized/Forbidden');
           return;
        }
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
