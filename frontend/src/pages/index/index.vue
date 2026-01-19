<template>
  <view class="container">
    <!-- Draggable Tennis Ball Background -->
    <movable-area class="bg-area">
      <movable-view class="bg-ball" direction="all" :x="200" :y="100" scale="true">
        <image src="/static/tennis-ball-bg.png" class="ball-img" mode="aspectFit"></image>
      </movable-view>
    </movable-area>

    <view class="header tennis-court-bg">
      <view class="header-content">
        <TennisBall :size="40" :animated="true" />
        <view class="header-text">
          <view class="app-title">
            <text class="title-text">Tennis</text>
            <text class="hot-text">Hot</text>
            <text class="title-text">Land</text>
          </view>
          <text class="sub-title">近期赛事</text>
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
            {{ match.name }}
          </text>
          <view class="match-meta">
            <text class="match-type-tag" v-if="match.matchType">{{ match.matchType }}</text>
            <text class="match-detail">📍 {{ match.location }}</text>
            <text class="match-detail">🕒 {{ formatDate(match.startTime) }}</text>
          </view>
          <text class="match-detail" v-if="match.drawSize">👥 {{ match._count?.applications || 0 }}/{{ match.drawSize }}</text>
          <text class="match-status" :class="match.status">{{ getStatusText(match.status) }}</text>
        </view>
        <view class="match-action">
          <view class="action-row">
            <template v-if="isRegistered(match.id)">
                <button class="btn-registered" v-if="getApplicationStatus(match.id) === 'APPROVED'" @click.stop="handleViewDraw(match)">已报名</button>
                <button class="btn-waitlist" v-else-if="getApplicationStatus(match.id) === 'WAITLIST'" @click.stop="handleViewDraw(match)">候补中</button>
                <button class="btn-registered" v-else>审核中</button>
                <button class="btn-cancel" @click.stop="handleCancel(match)">取消</button>
            </template>
            <button class="btn-register" @click.stop="handleRegister(match)" v-else-if="match.status === 'PENDING'">报名</button>
            <button class="btn-draw" @click.stop="handleViewDraw(match)">签表</button>
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
import { getMatches, deleteMatch, getUserApplications, cancelApplication } from '../../api';
import TennisBall from '../../components/TennisBall.vue';

const matches = ref<any[]>([]);
const isAdmin = ref(false); // 控制添加按钮显示
const myApplications = ref<any[]>([]);

const fetchMatches = async () => {
  /**
   * 获取赛事列表
   * 调用 API 获取最新赛事数据并更新 matches
   */
  try {
    uni.showLoading({ title: '加载赛事中...' });
    
    // Fetch matches separately to ensure list is shown even if applications fail
    try {
        const matchesRes = await getMatches();
        matches.value = matchesRes as any[];
    } catch (e) {
        console.error('Failed to fetch matches:', e);
        // Don't show toast immediately on first load to avoid scaring user during cold start
        // uni.showToast({ title: '获取赛事失败', icon: 'none' }); 
    }
    
    // Try to fetch applications, but don't block UI if it fails (e.g. 404 or not logged in)
    try {
        const appsRes = await getUserApplications();
        myApplications.value = appsRes as any[];
    } catch (e: any) {
        console.warn('Failed to fetch user applications (possibly not logged in or API missing):', e);
        myApplications.value = [];
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

const goToCreate = () => {
  // 跳转到创建赛事页面
  uni.navigateTo({ url: '/pages/match/create' });
};

const goToMatchList = () => {
  // Navigate to the new Match List page
  uni.navigateTo({ url: '/pages/match/list' });
};

const goToMyMatches = () => {
  uni.navigateTo({ url: '/pages/match/my-matches' });
};

const handleCardClick = (match: any) => {
  // Admin or User, clicking the card goes to Detail Page (Register/Preview)
  // Edit button is inside Detail page for Admin
  uni.navigateTo({ url: `/pages/match/register?id=${match.id}` });
};

const handleRegister = (match: any) => {
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
  return new Date(dateStr).toLocaleString('zh-CN');
};

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'PENDING': '报名中',
    'COMPLETED': '已结束',
    'IN_PROGRESS': '进行中',
    'CANCELLED': '已取消'
  };
  return statusMap[status] || status;
};

const getMatchCardClass = (type: string) => {
  if (!type) return '';
  if (['男单', '男双'].includes(type)) return 'style-blue';
  if (['女单', '女双'].includes(type)) return 'style-pink';
  if (['混双', '不限'].includes(type)) return 'style-mixed';
  return '';
};

onMounted(() => {
  fetchMatches();
  checkUserRole();
});

onShow(() => {
  fetchMatches();
});

onPullDownRefresh(() => {
  fetchMatches();
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
.match-action { margin-left: 10px; display: flex; flex-direction: column; gap: 8px; min-width: 140px; }
.action-row { display: flex; gap: 8px; justify-content: flex-end; }
.btn-register, .btn-registered, .btn-waitlist, .btn-cancel, .btn-draw, .btn-score, .btn-edit, .btn-referee, .btn-delete { 
  font-size: 12px; 
  padding: 0; 
  height: 28px; 
  line-height: 28px; 
  border-radius: 14px; 
  font-weight: bold; 
  flex: 1;
  text-align: center;
  min-width: 60px;
}
.btn-register { background-color: #3A5F0B; color: white; }
.btn-registered { background-color: #27ae60; color: white; cursor: pointer; }
.btn-waitlist { background-color: #f39c12; color: white; cursor: not-allowed; }
.btn-cancel { background-color: #e74c3c; color: white; margin-left: 5px; }
.btn-draw { background-color: #3C6382; color: white; }
.btn-score { background-color: #FFD700; color: #3A5F0B; }
.btn-edit { background-color: #2e86de; color: white; }
.btn-referee { background-color: #9b59b6; color: white; }
.btn-delete { background-color: #e74c3c; color: white; }
.btn-delete.full-width { width: 100%; flex: none; }
.match-name { font-size: 18px; font-weight: bold; display: flex; align-items: center; margin-bottom: 8px; color: #333; }
.match-detail { color: #666; font-size: 14px; display: block; margin-bottom: 4px; }
.match-status { margin-top: 5px; font-size: 12px; padding: 2px 8px; border-radius: 4px; background: #eee; display: inline-block; font-weight: bold; }
.match-status.PENDING { background: #e8f5e9; color: #3A5F0B; }
.match-status.COMPLETED { background: #f5f5f5; color: #666; }
.fab { position: fixed; bottom: 30px; right: 30px; width: 56px; height: 56px; background: #FFD700; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4); border: 2px solid white; }
.fab-icon { color: #3A5F0B; font-size: 32px; font-weight: bold; }
</style>
