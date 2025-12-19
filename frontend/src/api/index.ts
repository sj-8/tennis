const BASE_URL = 'http://localhost:3000/api';

export const request = (options: any) => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        resolve(res.data);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

export const getMatches = () => request({ url: '/matches' });
export const createMatch = (data: any) => request({ url: '/matches', method: 'POST', data });
export const getRankings = () => request({ url: '/matches/rankings' }); // Need to implement this backend API actually, or derive from results
export const submitResult = (id: number, results: any) => request({ url: `/matches/${id}/results`, method: 'POST', data: { results } });
