<template>
  <view class="container">
    <view class="header">
      <text class="title">近期赛事</text>
    </view>
    
    <view class="match-list">
      <view v-for="match in matches" :key="match.id" class="match-card">
        <view class="match-info">
          <text class="match-name">{{ match.name }}</text>
          <text class="match-detail">📍 {{ match.location }}</text>
          <text class="match-detail">🕒 {{ formatDate(match.startTime) }}</text>
          <text class="match-status" :class="match.status">{{ getStatusText(match.status) }}</text>
        </view>
        <view class="match-action">
          <button class="btn-register" @click.stop="handleRegister(match)" v-if="match.status === 'PENDING' || true">报名</button>
          <button class="btn-draw" @click.stop="handleViewDraw(match)">签表</button>
          <button class="btn-score" @click.stop="handleScore(match)" v-if="isAdmin">录分</button>
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
import { getMatches } from '../../api';

const matches = ref<any[]>([]);
const isAdmin = ref(false); // 控制添加按钮显示

const fetchMatches = async () => {
  try {
    const res = await getMatches();
    matches.value = res as any[];
  } catch (err) {
    console.error(err);
  }
};

const goToCreate = () => {
  uni.navigateTo({ url: '/pages/match/create' });
};

const handleRegister = (match: any) => {
  uni.navigateTo({ url: `/pages/match/register?id=${match.id}` });
};

const handleViewDraw = (match: any) => {
  uni.navigateTo({ url: `/pages/match/draw?id=${match.id}` });
};

const handleScore = (match: any) => {
  uni.navigateTo({ url: `/pages/match/score?id=${match.id}` });
};

const checkUserRole = () => {
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

onMounted(() => {
  fetchMatches();
  checkUserRole();
});
</script>

<style>
.container { padding: 20px; }
.header { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: bold; }
.match-card { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
.match-info { flex: 1; }
.match-action { margin-left: 10px; display: flex; flex-direction: column; gap: 5px; }
.btn-register { background-color: #2e7d32; color: white; font-size: 12px; padding: 0 10px; height: 28px; line-height: 28px; border-radius: 14px; }
.btn-draw { background-color: #1976d2; color: white; font-size: 12px; padding: 0 10px; height: 28px; line-height: 28px; border-radius: 14px; }
.btn-score { background-color: #f57c00; color: white; font-size: 12px; padding: 0 10px; height: 28px; line-height: 28px; border-radius: 14px; }
.match-name { font-size: 18px; font-weight: bold; display: block; margin-bottom: 5px; }
.match-detail { color: #666; font-size: 14px; display: block; }
.match-status { margin-top: 5px; font-size: 12px; padding: 2px 6px; border-radius: 4px; background: #eee; display: inline-block; }
.match-status.PENDING { background: #e3f2fd; color: #1976d2; }
.match-status.COMPLETED { background: #e8f5e9; color: #2e7d32; }
.fab { position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; background: #2e7d32; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
.fab-icon { color: white; font-size: 30px; }
</style>
