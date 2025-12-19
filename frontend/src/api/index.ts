const BASE_URL = 'https://express-4y4r-199217-5-1386469492.sh.run.tcloudbase.com/api';

export const request = (options: any) => {
  /**
   * 封装 uni.request 请求方法
   * 自动添加 Content-Type 头
   * 返回 Promise 对象
   */
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res: any) => {
        resolve(res.data);
      },
      fail: (err: any) => {
        reject(err);
      }
    });
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
