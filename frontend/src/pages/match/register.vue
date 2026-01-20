<template>
  <view class="container">
    <view class="header">
      <text class="title">{{ matchInfo.name || '赛事报名' }}</text>
      <view class="match-meta" v-if="matchInfo.id">
        <view class="meta-row location-row">
          <text class="meta-icon left">📍</text>
          <text class="meta-text center">{{ matchInfo.location }}</text>
          <view class="nav-btn right" @click.stop="openLocation" v-if="matchInfo.latitude && matchInfo.longitude">
             <text class="nav-icon">🧭</text>
             <text>导航</text>
          </view>
          <view class="placeholder-right" v-else></view>
        </view>
        <view class="meta-row">
            <text class="meta-icon left">🕒</text>
            <text class="meta-text center">{{ formatDate(matchInfo.startTime) }}</text>
            <view class="placeholder-right"></view>
          </view>
          <view class="meta-row" v-if="matchInfo.contact">
             <text class="meta-icon left">📞</text>
             <text class="meta-text center">{{ matchInfo.contact }}</text>
             <view class="nav-btn right" @click.stop="makeCall">
                <text class="nav-icon">📞</text>
                <text>致电</text>
             </view>
          </view>
        </view>

      <!-- Action Grid for Admin/Referee -->
      <view class="admin-actions" v-if="isAdmin">
         <view class="action-btn" @click="goToEdit">
            <text class="action-icon">📝</text>
            <text>编辑赛事</text>
         </view>
         <view class="action-btn" @click="goToReferee">
            <text class="action-icon">👮</text>
            <text>裁判管理</text>
         </view>
         <view class="action-btn" @click="goToScore">
            <text class="action-icon">📊</text>
            <text>录入比分</text>
         </view>
         <view class="action-btn" @click="goToDraw">
            <text class="action-icon">📋</text>
            <text>查看签表</text>
         </view>
         <view class="action-btn delete" @click="handleDelete">
            <text class="action-icon">🗑️</text>
            <text>删除赛事</text>
         </view>
      </view>

      <!-- Withdrawal Notice -->
      <view class="notice-section">
         <text class="notice-title">退赛须知</text>
         <text class="notice-content">{{ matchInfo.withdrawalNotice || '开赛前96小时外可免费退赛，24小时内不可退赛。' }}</text>
      </view>
    </view>

    <view class="form-group">
      <text class="label">真实姓名</text>
      <input class="input" v-model="form.realName" placeholder="请输入真实姓名" :disabled="isVerified" />
    </view>

    <view class="form-group">
      <text class="label">身份证号</text>
      <input class="input" v-model="form.idCard" type="idcard" placeholder="请输入身份证号" :disabled="isVerified" />
    </view>

    <view class="form-group">
      <text class="label">手机号码</text>
      <input class="input" v-model="form.phone" type="number" placeholder="请输入手机号码" :disabled="isVerified" />
    </view>

    <!-- Partner Selection for Doubles -->
    <view class="form-group" v-if="isDoubles">
        <text class="label">双打搭档</text>
        <view v-if="partner" class="selected-partner">
            <image :src="partner.avatar || '/static/default-avatar.png'" class="partner-avatar" mode="aspectFill" />
            <view class="partner-info">
                <text class="partner-name">{{ partner.realName || partner.name }}</text>
            </view>
            <view class="btn-remove" @click="removePartner">✕</view>
        </view>
        <view v-else>
            <view class="search-box">
                <input class="input search-input" v-model="partnerQuery" placeholder="搜索搭档(姓名/手机号)" @confirm="onSearchPartner" />
                <view class="btn-search" @click="onSearchPartner">搜索</view>
            </view>
            <view class="search-results" v-if="partnerSearchResults.length > 0">
                <view class="result-item" v-for="p in partnerSearchResults" :key="p.id" @click="selectPartner(p)">
                    <image :src="p.avatar || '/static/default-avatar.png'" class="result-avatar" mode="aspectFill" />
                    <text class="result-name">{{ p.realName || p.name }}</text>
                </view>
            </view>
        </view>
    </view>
    
    <button class="btn-submit" @click="submit" :loading="loading" v-if="!hasApplied">提交报名</button>
    <view class="applied-actions" v-else>
        <button class="btn-action btn-view-draw" @click="goToDraw">已报名 - 查看签表</button>
        <button class="btn-action btn-cancel" @click="handleCancelApplication">取消报名</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { submitApplication, getMatches, deleteMatch, getMatchParticipants, cancelApplication, searchPlayers } from '../../api';

const loading = ref(false);
const tournamentId = ref<number | null>(null);
const matchInfo = ref<any>({});
const isVerified = ref(false);
const isAdmin = ref(false);
const hasApplied = ref(false);
const form = ref({
  realName: '',
  idCard: '',
  phone: ''
});

// Partner Selection State
const isDoubles = computed(() => {
    return matchInfo.value.matchType && matchInfo.value.matchType.includes('双');
});
const partner = ref<any>(null);
const partnerQuery = ref('');
const partnerSearchResults = ref<any[]>([]);
const showPartnerSearch = ref(false);

const onSearchPartner = async () => {
    if (!partnerQuery.value) return;
    try {
        const res: any = await searchPlayers(partnerQuery.value);
        partnerSearchResults.value = res;
    } catch (err) {
        uni.showToast({ title: '搜索失败', icon: 'none' });
    }
};

const selectPartner = (p: any) => {
    partner.value = p;
    partnerSearchResults.value = [];
    partnerQuery.value = '';
    showPartnerSearch.value = false;
};

const removePartner = () => {
    partner.value = null;
};


onShow(() => {
  const userInfo = uni.getStorageSync('userInfo');
  if (userInfo && (userInfo.role === 'ADMIN' || userInfo.role === 'SUPER_ADMIN')) {
    isAdmin.value = true;
  }

  if (userInfo && (userInfo.isVerified || userInfo.idCard)) {
    isVerified.value = true;
    form.value.realName = userInfo.realName || '';
    form.value.idCard = userInfo.idCard || '';
    form.value.phone = userInfo.phone || '';
    
    // Check if user has applied for this match
    if (tournamentId.value) {
        checkApplicationStatus(userInfo.id, tournamentId.value);
    }
  } else {
    isVerified.value = false;
    // Prompt user to verify
    uni.showModal({
      title: '提示',
      content: '报名比赛需先完成实名认证',
      confirmText: '去认证',
      showCancel: true,
      success: (res: any) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/my/auth' });
        } else {
          uni.navigateBack();
        }
      }
    });
  }
});

const checkApplicationStatus = async (userId: number, matchId: number) => {
  try {
    const participants: any = await getMatchParticipants(matchId);
    // participants is array of applications? Check api/index.ts or backend
    // backend getMatchParticipants returns PlayerApplication with Player include
    const application = participants.find((p: any) => p.playerId === userId);
    if (application) {
        hasApplied.value = true;
    }
  } catch (err) {
    console.error('Failed to check application status', err);
  }
};

const showManageMenu = () => {
  // Logic moved to direct buttons
};

const goToEdit = () => {
  uni.navigateTo({ url: `/pages/match/create?id=${tournamentId.value}` });
};

const goToReferee = () => {
  uni.navigateTo({ url: `/pages/match/referees?id=${tournamentId.value}` });
};

const goToDraw = () => {
  uni.navigateTo({ url: `/pages/match/draw?id=${tournamentId.value}` });
};

const goToScore = () => {
  uni.navigateTo({ url: `/pages/match/score?id=${tournamentId.value}` });
};

const handleDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除该赛事吗？',
    confirmColor: '#ff3b30',
    success: async (res: any) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' });
        try {
          await deleteMatch(Number(tournamentId.value));
          uni.showToast({ title: '删除成功' });
          setTimeout(() => {
            uni.switchTab({ url: '/pages/index/index' });
          }, 1500);
        } catch (err) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

onLoad(async (options: any) => {
  if (options.id) {
    tournamentId.value = Number(options.id);
    // Fetch match info for display
    try {
        const matches: any = await getMatches();
        const match = matches.find((m: any) => m.id === tournamentId.value);
        if (match) {
            matchInfo.value = match;
        }
    } catch (e) {
        console.error('Failed to load match info:', e);
    }
  }
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.toTimeString().slice(0, 5)} ${weekDay}`;
};

const handleCancelApplication = () => {
  uni.showModal({
    title: '确认取消',
    content: '确定要取消报名吗？',
    success: async (res: any) => {
      if (res.confirm) {
        uni.showLoading({ title: '取消中...' });
        try {
          if (tournamentId.value) {
            await cancelApplication(tournamentId.value);
            uni.showToast({ title: '取消成功' });
            hasApplied.value = false; // Reset state
            // Optionally refresh participants or just let user re-apply
          }
        } catch (err) {
          uni.showToast({ title: '取消失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

const openLocation = () => {
  // Use coordinates if available (backend doesn't store them yet, so use geocoder or just name)
  // If we don't have lat/long, we can only open map with name, but openLocation requires lat/long.
  // Workaround: Use uni.openLocation with 0,0 and name? No, that opens ocean.
  // Better: If we don't have coords, we can't open location accurately.
  // But wait, create.vue now gets coords. If we save them, we can use them.
  // Currently backend schema doesn't have lat/long.
  // I will just log for now or show toast if coords missing.
  // BUT user requirement is "can open location".
  // So I should ideally add lat/long to backend Tournament model.
  // Since I didn't add it to schema yet, I will rely on name address if possible or just mock it?
  // No, `uni.openLocation` needs latitude/longitude.
  // If not available, I can't open it properly.
  // I will skip implementation of opening map without coords for now, or just show name.
  // Wait, I can try to use `uni.map` or just show the address text.
  // The user requirement "Create match AND preview match can get/open location".
  // I added chooser in create.
  // I should add lat/long to backend to complete the loop.
  // But schema update is another step.
  // Let's assume for now we just show the address text which is already done.
  // If I want to open map, I need coords.
  // I will add a TO-DO or check if I can add schema change quickly.
  // I already updated schema for Player. I can update for Tournament too.
  
  // Let's implement the function but handle missing coords.
  if (matchInfo.value.latitude && matchInfo.value.longitude) {
      uni.openLocation({
          latitude: Number(matchInfo.value.latitude),
          longitude: Number(matchInfo.value.longitude),
          name: matchInfo.value.location,
          address: matchInfo.value.location
      });
  } else {
      uni.showToast({ title: '暂无定位信息', icon: 'none' });
  }
};

const makeCall = () => {
  if (matchInfo.value.contact) {
    uni.makePhoneCall({
      phoneNumber: matchInfo.value.contact
    });
  }
};

const submit = async () => {
  /**
   * 提交报名信息
   * 1. 验证必填项
   * 2. 检查登录状态
   * 3. 调用报名 API
   */
  if (!form.value.realName || !form.value.idCard || !form.value.phone) {
    uni.showToast({ title: '请填写必填项', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    const userInfo = uni.getStorageSync('userInfo');
    if (!userInfo || !userInfo.id) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        // In real app, trigger login flow
        return;
    }

    if (isDoubles.value && !partner.value) {
        uni.showToast({ title: '双打比赛请选择搭档', icon: 'none' });
        return;
    }

    await submitApplication({
      playerId: userInfo.id,
      tournamentId: tournamentId.value,
      partnerId: partner.value ? partner.value.id : null,
      ...form.value
    });
    
    uni.showToast({ title: '报名提交成功' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err) {
    uni.showToast({ title: '提交失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};
</script>

<style>
.container { padding: 20px; }
.match-meta { margin-top: 15px; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; }
.meta-row { display: flex; align-items: center; margin-bottom: 5px; color: white; font-size: 14px; justify-content: space-between; }
.meta-row:last-child { margin-bottom: 0; }
.meta-icon { width: 24px; text-align: center; font-size: 16px; }
.meta-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.center { text-align: center; }
.left { text-align: left; }
.right { text-align: right; }
.placeholder-right { width: 60px; /* Approximate width of nav button + margin to balance layout */ }
.meta-arrow { color: rgba(255,255,255,0.7); font-family: monospace; }
.header { margin-bottom: 20px; text-align: center; background: #3A5F0B; padding: 30px 20px; color: white; border-radius: 0 0 20px 20px; margin-top: -20px; margin-left: -20px; margin-right: -20px; }
.admin-actions {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: white;
  background: rgba(255,255,255,0.1);
  padding: 10px 5px;
  border-radius: 8px;
}
.action-btn.delete { background: rgba(255,59,48,0.2); color: #ffcccc; }
.action-icon { font-size: 20px; margin-bottom: 5px; }

.notice-section { margin-top: 20px; background: #fff0f0; padding: 15px; border-radius: 8px; border: 1px solid #ffcccc; }
.notice-title { font-weight: bold; color: #d32f2f; font-size: 14px; display: block; margin-bottom: 5px; }
.notice-content { font-size: 12px; color: #d32f2f; line-height: 1.5; }

.nav-btn { background: white; color: #3A5F0B; font-size: 12px; padding: 2px 8px; border-radius: 12px; margin-left: 10px; font-weight: bold; display: inline-flex; align-items: center; }
.nav-icon { margin-right: 4px; font-size: 12px; }

.admin-edit-btn {
  display: none;
}
.title { font-size: 22px; font-weight: bold; display: block; }
.form-group { margin-bottom: 15px; }
.label { display: block; margin-bottom: 8px; font-weight: bold; font-size: 14px; }
.input { width: 100%; height: 44px; padding: 0 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background: #fff; }
.textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background: #fff; }
.btn-submit { background: #2e7d32; color: white; padding: 12px; border-radius: 4px; text-align: center; margin-top: 30px; font-size: 16px; }
.btn-action { color: white; padding: 12px; border-radius: 4px; text-align: center; font-size: 16px; flex: 1; }
.btn-view-draw { background: #1976d2; }
.btn-cancel { background: #d32f2f; }
.applied-actions { display: flex; gap: 10px; margin-top: 30px; }

/* Partner Search Styles */
.search-box { display: flex; gap: 10px; }
.search-input { flex: 1; }
.btn-search { background: #3A5F0B; color: white; padding: 0 15px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.search-results { margin-top: 10px; background: white; border: 1px solid #eee; border-radius: 4px; max-height: 200px; overflow-y: auto; }
.result-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
.result-avatar { width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; background: #eee; }
.result-name { font-size: 14px; }
.selected-partner { display: flex; align-items: center; background: #f0f8ff; padding: 10px; border-radius: 8px; border: 1px solid #e3f2fd; }
.partner-avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; background: #eee; }
.partner-info { flex: 1; }
.partner-name { font-weight: bold; font-size: 16px; }
.btn-remove { color: #999; font-size: 18px; padding: 5px; }

</style>
