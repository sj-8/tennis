<template>
  <view class="container">
    <view class="header tennis-court-bg">
      <view class="header-content">
        <TennisBall :size="40" :animated="true" />
        <view class="header-text">
          <view class="app-title">
            <text class="title-text">Tennis</text>
            <text class="hot-text">Hot</text>
            <text class="title-text">Land</text>
          </view>
          <text class="sub-title">Let's Play Tennis</text>
        </view>
      </view>
    </view>
    
    <!-- Quick Entry Buttons -->
    <view class="quick-entry">
      <view class="entry-card" @click="goToMatchList">
        <view class="entry-text">
          <text class="entry-title">比赛报名</text>
          <text class="entry-sub">查询比赛并报名</text>
        </view>
        <view class="entry-icon-bg">🏆</view>
      </view>
      <view class="entry-card" @click="goToMyMatches">
        <view class="entry-text">
          <text class="entry-title">我的比赛</text>
          <text class="entry-sub">已报名中签比赛</text>
        </view>
        <view class="entry-icon-bg purple">🏅</view>
      </view>
    </view>

    <view class="section-title-row">
      <view class="title-bar"></view>
      <text class="section-title">热门比赛</text>
    </view>
    
    <view class="match-list">
      <view class="match-card" 
            v-for="match in matches" 
            :key="match.id" 
            @click="handleCardClick(match)"
            :class="getMatchCardClass(match.matchType)">
        <view class="match-info">
          <text class="match-name">
            <text class="tennis-title-deco"></text>
            {{ match.name }} <text v-if="match.matchType" style="margin-left: 5px; font-weight: normal;">- {{ match.matchType }}</text>
          </text>
          <view class="match-meta">
            <!-- <text class="match-type-tag" v-if="match.matchType">{{ match.matchType }}</text> -->
            <view class="location-row">
                <text class="match-detail"><text class="icon-fixed">📍</text>{{ match.location }}</text>
                <view class="nav-btn" @click.stop="openLocation(match)" v-if="match.latitude && match.longitude">
                    <text class="nav-icon">🧭</text>
                    <text>导航</text>
                </view>
            </view>
            <text class="match-detail"><text class="icon-fixed">🕒</text>{{ formatDate(match.startTime) }}</text>
          </view>
          <text class="match-detail" v-if="match.drawSize">
              <text class="icon-fixed">👥</text>{{ match._count?.applications || 0 }}/{{ match.drawSize }}
              <text v-if="match.fee && match.fee > 0" style="margin-left: 10px; color: #ff6b81; font-weight: bold;">
                  ¥{{ match.fee }}
              </text>
          </text>
          <text class="match-status" :class="match.status">{{ getStatusText(match.status, match) }}</text>
        </view>
          <view class="match-action">
            <view class="action-column">
                <template v-if="isRegistered(match.id)">
                    <text class="status-text registered">已报名</text>
                </template>
                <template v-else-if="getPendingOrder(match.id)">
                    <text class="status-text pending">待支付</text>
                </template>
                <template v-else-if="match.status === 'PENDING'">
                    <text class="status-text open">报名中</text>
                </template>
                <template v-else>
                     <text class="status-text closed">已截止</text>
                </template>
            </view>
          </view>
      </view>
    </view>

    <view class="fab" @click="goToCreate" v-if="isAdmin">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { getMatches, deleteMatch, getUserApplications, cancelApplication, getMyOrders } from '../../api';
import TennisBall from '../../components/TennisBall.vue';

const matches = ref<any[]>([]);
const isAdmin = ref(false); // 控制添加按钮显示
const myApplications = ref<any[]>([]);
const myOrders = ref<any[]>([]);

const fetchMatches = async (isPullDown = false) => {
  /**
   * 获取赛事列表
   * 优化：缓存优先 + 并行请求
   */
  // 1. 尝试读取缓存
  if (!isPullDown) {
    const cachedMatches = uni.getStorageSync('cache_matches');
    const cachedApps = uni.getStorageSync('cache_my_applications');
    const cachedOrders = uni.getStorageSync('cache_my_orders');
    if (cachedMatches) matches.value = cachedMatches;
    if (cachedApps) myApplications.value = cachedApps;
    if (cachedOrders) myOrders.value = cachedOrders;
  }

  // 2. 仅在无数据且非下拉刷新时显示 Loading
  if (matches.value.length === 0 && !isPullDown) {
    uni.showLoading({ title: '加载赛事中...' });
  }

  try {
    // 3. 并行请求数据
    const [matchesRes, appsRes, ordersRes] = await Promise.all([
      getMatches({ limit: 5 }).catch(e => ({ _err: e })), 
      getUserApplications().catch(e => ({ _err: e })),
      getMyOrders().catch(e => ({ _err: e }))
    ]);

    // 4. 处理赛事数据
    if (!(matchesRes as any)._err) {
      matches.value = matchesRes as any[];
      uni.setStorageSync('cache_matches', matches.value);
    } else {
      console.error('Failed to fetch matches:', (matchesRes as any)._err);
    }

    // 5. 处理报名数据
    if (!(appsRes as any)._err) {
      myApplications.value = appsRes as any[];
      uni.setStorageSync('cache_my_applications', myApplications.value);
    }

    // 6. 处理订单数据
    if (!(ordersRes as any)._err) {
      myOrders.value = ordersRes as any[];
      uni.setStorageSync('cache_my_orders', myOrders.value);
    }

  } catch (err) {
    console.error(err);
  } finally {
    uni.hideLoading();
    uni.stopPullDownRefresh();
  }
};

const isRegistered = (matchId: number) => {
  if (!myApplications.value) return false;
  return myApplications.value.some((app: any) => app.tournamentId === matchId && ['APPROVED', 'WAITLIST', 'PENDING'].includes(app.status));
};

const isReferee = (match: any) => {
  const userInfo = uni.getStorageSync('userInfo');
  if (!userInfo || !match.referees) return false;
  return match.referees.some((r: any) => r.playerId === userInfo.id);
};

const getApplicationStatus = (matchId: number) => {
  if (!myApplications.value) return null;
  const app = myApplications.value.find((app: any) => app.tournamentId === matchId);
  return app ? app.status : null;
};

const getPendingOrder = (matchId: number) => {
  if (!myOrders.value) return null;
  return myOrders.value.find((o: any) => o.tournamentId === matchId && o.status === 'PENDING');
};

const handlePayOrder = (match: any) => {
    const order = getPendingOrder(match.id);
    if (order) {
        uni.navigateTo({ url: `/pages/my/order-detail?data=${encodeURIComponent(JSON.stringify(order))}` });
    }
};

const checkLogin = () => {
  const userInfo = uni.getStorageSync('userInfo');
  if (!userInfo) {
      uni.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => {
          uni.switchTab({ url: '/pages/my/my' });
      }, 1000);
      return false;
  }
  return true;
};

const goToCreate = () => {
  if (!checkLogin()) return;
  // 跳转到创建赛事页面
  uni.navigateTo({ url: '/pages/match/create' });
};

const goToMatchList = () => {
  // Navigate to the new Match List page
  uni.navigateTo({ url: '/pages/match/list' });
};

const goToMyMatches = () => {
  if (!checkLogin()) return;
  uni.navigateTo({ url: '/pages/match/my-matches' });
};

const handleCardClick = (match: any) => {
  // Admin or User, clicking the card goes to Detail Page (Register/Preview)
  // Edit button is inside Detail page for Admin
  uni.navigateTo({ url: `/pages/match/register?id=${match.id}` });
};

const handleRegister = (match: any) => {
  const userInfo = uni.getStorageSync('userInfo');
  if (!userInfo) {
      uni.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => {
          uni.switchTab({ url: '/pages/my/my' });
      }, 1000);
      return;
  }
  // 跳转到签表页面（在签表页面点击报名按钮进行报名）
  uni.navigateTo({ url: `/pages/match/draw?id=${match.id}` });
};

const handleViewDraw = (match: any) => {
  // 跳转到签表查看页面
  uni.navigateTo({ url: `/pages/match/draw?id=${match.id}` });
};

const handleScore = (match: any) => {
  // 跳转到录分页面
  uni.navigateTo({ url: `/pages/match/score?id=${match.id}` });
};

const handleEdit = (match: any) => {
  // 跳转到编辑页面（复用创建页面，带上 ID）
  uni.navigateTo({ url: `/pages/match/create?id=${match.id}` });
};

const handleCancel = async (match: any) => {
  uni.showModal({
    title: '取消报名',
    content: '确定要取消报名吗？',
    success: async (res: any) => {
      if (res.confirm) {
        try {
          await cancelApplication(match.id);
          uni.showToast({ title: '取消成功' });
          fetchMatches();
        } catch (err: any) {
          uni.showToast({ title: (err.message || '取消失败') + '，请联系管理员', icon: 'none' });
        }
      }
    }
  });
};

const handleManageReferees = (match: any) => {
  uni.navigateTo({ url: `/pages/match/referees?id=${match.id}` });
};

const handleDelete = async (match: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除赛事“${match.name}”吗？此操作不可恢复。`,
    success: async (res: any) => {
      if (res.confirm) {
        try {
          await deleteMatch(match.id);
          uni.showToast({ title: '删除成功' });
          fetchMatches(); // 刷新列表
        } catch (err) {
          uni.showToast({ title: '删除失败，权限不足或有依赖数据', icon: 'none' });
        }
      }
    }
  });
};

const checkUserRole = () => {
  /**
   * 检查用户角色
   * 如果是管理员，显示创建赛事和录分按钮
   */
  // 模拟从本地存储获取用户信息
  const userInfo = uni.getStorageSync('userInfo');
  // 临时调试：强制设为管理员，方便看到按钮
  isAdmin.value = true; 
  if (userInfo && userInfo.role === 'ADMIN') {
    isAdmin.value = true;
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  // Format: YYYY-MM-DD HH:mm 周X
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.toTimeString().slice(0, 5)} ${weekDay}`;
};

const getStatusText = (status: string, match: any) => {
  if (status === 'COMPLETED') return '已结束';
  if (status === 'ONGOING') return '进行中';
  if (status === 'CANCELLED') return '已取消';
  
  // Handle PENDING status with time logic
  const now = new Date();
  const start = new Date(match.startTime);
  const regStart = match.registrationStart ? new Date(match.registrationStart) : null;
  const regEnd = match.registrationEnd ? new Date(match.registrationEnd) : null;

  if (now > start) {
      return '已结束'; 
  }
  
  if (regStart && now < regStart) return '待报名';
  if (regEnd && now > regEnd) return '报名截止';
  
  return '报名中';
};

const getMatchCardClass = (type: string) => {
  if (!type) return '';
  if (['男单', '男双'].includes(type)) return 'style-blue';
  if (['女单', '女双'].includes(type)) return 'style-pink';
  if (['混双', '不限'].includes(type)) return 'style-mixed';
  return '';
};

const openLocation = (match: any) => {
  uni.openLocation({
    latitude: Number(match.latitude),
    longitude: Number(match.longitude),
    name: match.location,
    address: match.location
  });
};

onMounted(() => {
  // Initial load handled by onShow
});

onShow(() => {
  checkUserRole();
  const shouldRefresh = uni.getStorageSync('should_refresh_matches');
  if (shouldRefresh) {
      uni.removeStorageSync('should_refresh_matches');
      fetchMatches();
  } else {
      fetchMatches();
  }
});

onPullDownRefresh(() => {
  fetchMatches(true);
});
</script>

<style>
.container { padding: 0; background-color: #f5f5f5; min-height: 100vh; }
.header { 
  margin-bottom: 20px; 
  padding: 30px 20px; 
  border-bottom-left-radius: 20px; 
  border-bottom-right-radius: 20px; 
  box-shadow: 0 4px 10px rgba(58, 95, 11, 0.3);
  color: white;
}

/* Removed background image that caused 500 error */
.tennis-court-bg {
  background: linear-gradient(135deg, #3A5F0B 0%, #2e7d32 100%);
  position: relative;
  overflow: hidden;
}
.header-content {
  display: flex;
  align-items: center;
  gap: 15px;
}
.header-text {
  display: flex;
  flex-direction: column;
}
.app-title {
  font-size: 16px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
  margin-bottom: 8px;
}
.hot-text {
  color: #FFD700;
  text-shadow: 
    0 0 2px #ff0000,
    0 -1px 2px #ff9900;
  font-style: italic;
  animation: fire-flicker 1.5s infinite alternate;
}
.sub-title {
  font-size: 24px;
  color: white;
  font-weight: 900;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

@keyframes fire-flicker {
  0% { text-shadow: 0 0 4px #ff0000, 0 -2px 4px #ff9900, 2px -5px 6px #ff5500; transform: scale(1); }
  50% { text-shadow: 0 0 4px #ff0000, 0 -3px 5px #ff9900, -2px -6px 8px #ff5500; transform: scale(1.05); }
  100% { text-shadow: 0 0 4px #ff0000, 0 -2px 4px #ff9900, 2px -5px 6px #ff5500; transform: scale(1); }
}
/* Quick Entry Styles */
.quick-entry {
  display: flex;
  gap: 15px;
  padding: 0 20px;
  margin-top: -30px;
  margin-bottom: 25px;
  position: relative;
  z-index: 10;
}
.entry-card {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.entry-text {
  display: flex;
  flex-direction: column;
}
.entry-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}
.entry-sub {
  font-size: 12px;
  color: #999;
}
.entry-icon-bg {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}
.entry-icon-bg.purple {
  background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
}

.section-title-row {
  display: flex;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 15px;
}
.title-bar {
  width: 4px;
  height: 16px;
  background: #3A5F0B; /* Primary Green */
  margin-right: 8px;
  border-radius: 2px;
}
.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.match-list { padding: 0 20px; }
.match-card { 
  background: #fff; 
  padding: 15px; 
  border-radius: 12px; 
  margin-bottom: 15px; 
  box-shadow: 0 4px 8px rgba(0,0,0,0.05); 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  border-left: 5px solid #FFD700; /* 网球黄装饰线 */
}
.match-info { flex: 1; }
.match-action { margin-left: 10px; display: flex; flex-direction: column; gap: 8px; min-width: 60px; justify-content: center; align-items: flex-end; }
.action-column { display: flex; flex-direction: column; gap: 8px; width: 100%; align-items: flex-end; }

.status-text { font-size: 14px; font-weight: bold; }
.status-text.registered { color: #27ae60; }
.status-text.pending { color: #ef6c00; }
.status-text.open { color: #3A5F0B; }
.status-text.closed { color: #999; }

/* .btn-register, .btn-registered, .btn-waitlist, .btn-cancel, .btn-draw, .btn-score, .btn-edit, .btn-referee, .btn-delete { ... } Removed/Hidden */

.btn-cancel { margin-left: 0; margin-top: 5px; }

.btn-score { 
  font-size: 12px; 
  padding: 0; 
  height: 28px; 
  line-height: 28px; 
  border-radius: 14px; 
  font-weight: bold; 
  width: 100%; 
  text-align: center;
  background-color: #FFD700; 
  color: #3A5F0B; 
}

.location-row { display: flex; align-items: center; margin-bottom: 4px; }
.nav-btn { background: #3A5F0B; color: white; font-size: 10px; padding: 2px 8px; border-radius: 12px; margin-left: 15px; display: inline-flex; align-items: center; min-width: 40px; justify-content: center; }
.nav-icon { margin-right: 2px; font-size: 10px; }
.btn-register { background-color: #3A5F0B; color: white; }
.btn-registered { background-color: #27ae60; color: white; cursor: pointer; }
.btn-waitlist { background-color: #f39c12; color: white; cursor: not-allowed; }
.btn-cancel { background-color: #e74c3c; color: white; margin-left: 5px; }
.btn-draw { background-color: #3C6382; color: white; }
.btn-score { background-color: #FFD700; color: #3A5F0B; }
.btn-edit { background-color: #2e86de; color: white; }
.btn-referee { background-color: #9b59b6; color: white; }
.btn-pay { background-color: #ff9800; color: white; }
.btn-delete { background-color: #e74c3c; color: white; }
.btn-delete.full-width { width: 100%; flex: none; }
.match-name { font-size: 16px; font-weight: bold; display: flex; align-items: center; margin-bottom: 8px; color: #333; }
.tennis-title-deco {
  display: inline-block;
  width: 8px;
  height: 24px;
  background-color: #FFD700;
  margin-right: 8px;
  border-radius: 4px;
  vertical-align: middle;
  /* Align with icons below: Icon width 20px, center is 10px. Deco width 8px, center is 4px. Offset = 10 - 4 = 6px */
  margin-left: 6px; 
}
.location-row { display: flex; align-items: center; margin-bottom: 4px; }
.match-detail { color: #666; font-size: 14px; display: flex; align-items: center; margin-bottom: 4px; }
.icon-fixed { width: 20px; text-align: center; margin-right: 5px; display: inline-block; }
.match-status { margin-top: 5px; font-size: 12px; padding: 2px 8px; border-radius: 4px; background: #eee; display: inline-block; font-weight: bold; }
.match-status.PENDING { background: #e8f5e9; color: #3A5F0B; }
.match-status.COMPLETED { background: #f5f5f5; color: #666; }
.fab { position: fixed; bottom: 30px; right: 30px; width: 56px; height: 56px; background: #FFD700; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4); border: 2px solid white; }
.fab-icon { color: #3A5F0B; font-size: 32px; font-weight: bold; }
</style>
