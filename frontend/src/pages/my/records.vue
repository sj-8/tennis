<template>
  <view class="container">
    <view v-if="applications.length === 0" class="empty-tip">
      <text>暂无参赛记录</text>
    </view>
    
    <view class="record-list" v-else>
      <view class="record-card" v-for="app in applications" :key="app.id" @click="goToMatch(app.tournament.id)">
        <view class="card-header">
          <text class="match-name">{{ app.tournament.name }}</text>
          <text class="status-tag" :class="getStatusClass(app.status)">{{ getStatusText(app.status) }}</text>
        </view>
        <view class="card-body">
          <view class="info-row">
            <text class="label">时间：</text>
            <text>{{ formatDate(app.tournament.startTime) }}</text>
          </view>
          <view class="info-row">
            <text class="label">地点：</text>
            <text>{{ app.tournament.location }}</text>
          </view>
          <view class="info-row" v-if="app.partner">
            <text class="label">搭档：</text>
            <text>{{ app.partner.name || app.partner.realName }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getUserApplications } from '../../api';

const applications = ref<any[]>([]);

onShow(() => {
  fetchRecords();
});

const fetchRecords = async () => {
  try {
    const res: any = await getUserApplications();
    applications.value = res;
  } catch (err) {
    console.error(err);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

const getStatusText = (status: string) => {
  const map: any = {
    'PENDING': '审核中',
    'APPROVED': '报名成功',
    'WAITLIST': '候补中',
    'REJECTED': '已拒绝',
    'CANCELLED': '已取消'
  };
  return map[status] || status;
};

const getStatusClass = (status: string) => {
  if (status === 'APPROVED') return 'status-success';
  if (status === 'WAITLIST') return 'status-warning';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'status-gray';
  return 'status-primary';
};

const goToMatch = (id: number) => {
    uni.navigateTo({ url: `/pages/match/register?id=${id}` });
};
</script>

<style>
.container { padding: 20px; background-color: #f5f5f5; min-height: 100vh; }
.empty-tip { text-align: center; margin-top: 100px; color: #999; }

.record-list { display: flex; flex-direction: column; gap: 15px; }
.record-card { background: white; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.match-name { font-size: 16px; font-weight: bold; color: #333; }
.status-tag { font-size: 12px; padding: 2px 6px; border-radius: 4px; }
.status-success { background: #e8f5e9; color: #2e7d32; }
.status-warning { background: #fff3e0; color: #ef6c00; }
.status-gray { background: #f5f5f5; color: #9e9e9e; }
.status-primary { background: #e3f2fd; color: #1976d2; }

.info-row { font-size: 14px; color: #666; margin-bottom: 5px; display: flex; }
.label { width: 50px; color: #999; }
</style>