<template>
  <view class="container">
    <view class="tabs">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text>待比赛</text>
        <view class="tab-line" v-if="currentTab === 0"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text>已完成</text>
        <view class="tab-line" v-if="currentTab === 1"></view>
      </view>
    </view>

    <view class="match-list">
      <view class="match-card" v-for="app in filteredList" :key="app.id" @click="goToDetail(app.tournament)">
        <view class="card-content">
          <view class="match-info">
            <text class="match-name">{{ app.tournament.name }}</text>
            <view class="info-row">
              <text class="icon">🕒</text>
              <text>{{ formatDate(app.tournament.startTime) }}</text>
            </view>
            <view class="info-row">
              <text class="icon">📍</text>
              <text>{{ app.tournament.location }}</text>
            </view>
            <view class="tags">
               <text class="tag">{{ app.tournament.matchType || '公开赛' }}</text>
               <text class="tag status" :class="getStatusClass(app.status)">{{ getStatusText(app.status) }}</text>
            </view>
          </view>
          <!-- Optional: Show result or score if completed -->
        </view>
      </view>
      
      <view v-if="filteredList.length === 0" class="empty-tip">
        <text>暂无相关比赛</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api';

const currentTab = ref(0); // 0: Pending, 1: Completed
const applications = ref<any[]>([]);

const fetchApplications = async () => {
  try {
    const res: any = await request({ url: '/application/my' });
    applications.value = res;
  } catch (err) {
    console.error(err);
  }
};

onShow(() => {
  fetchApplications();
});

const filteredList = computed(() => {
  const now = new Date();
  
  // 1. Deduplicate by tournamentId (Keep the latest one because API sorts by desc)
  const seenIds = new Set();
  const uniqueApps: any[] = [];
  
  for (const app of applications.value) {
      if (app.tournament && !seenIds.has(app.tournament.id)) {
          seenIds.add(app.tournament.id);
          uniqueApps.push(app);
      }
  }

  return uniqueApps.filter((app: any) => {
    if (!app.tournament) return false;
    const startTime = new Date(app.tournament.startTime);
    
    if (currentTab.value === 0) {
      return startTime >= now;
    } else {
      return startTime < now;
    }
  });
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.toTimeString().slice(0, 5)} ${weekDay}`;
};

const getStatusText = (status: string) => {
  const map: any = {
    'PENDING': '审核中',
    'APPROVED': '报名成功',
    'REJECTED': '报名失败',
    'WAITLIST': '候补中',
    'CANCELLED': '已取消'
  };
  return map[status] || status;
};

const getStatusClass = (status: string) => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'fail';
  return 'pending';
};

const goToDetail = (match: any) => {
  uni.navigateTo({ url: `/pages/match/register?id=${match.id}` });
};
</script>

<style>
.container { background-color: #f5f5f5; min-height: 100vh; }
.tabs { display: flex; background: white; margin-bottom: 10px; }
.tab-item { flex: 1; text-align: center; padding: 15px 0; font-size: 16px; color: #666; position: relative; }
.tab-item.active { color: #3A5F0B; font-weight: bold; }
.tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 30px; height: 3px; background: #3A5F0B; border-radius: 2px; }

.match-list { padding: 10px; }
.match-card { background: white; border-radius: 12px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.match-name { font-size: 16px; font-weight: bold; margin-bottom: 8px; display: block; }
.info-row { display: flex; align-items: center; color: #666; font-size: 13px; margin-bottom: 5px; }
.icon { margin-right: 6px; font-size: 14px; }
.tags { margin-top: 10px; display: flex; gap: 8px; }
.tag { font-size: 12px; padding: 2px 6px; background: #f0f0f0; color: #666; border-radius: 4px; }
.tag.status { font-weight: bold; }
.tag.success { background: #e8f5e9; color: #2e7d32; }
.tag.fail { background: #ffebee; color: #c62828; }
.tag.pending { background: #fff3e0; color: #ef6c00; }

.empty-tip { text-align: center; margin-top: 50px; color: #999; }
</style>