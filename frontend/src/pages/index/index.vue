<template>
  <view class="container">
    <view class="header">
      <text class="title">Upcoming Matches</text>
    </view>
    
    <view class="match-list">
      <view v-for="match in matches" :key="match.id" class="match-card">
        <view class="match-info">
          <text class="match-name">{{ match.name }}</text>
          <text class="match-detail">📍 {{ match.location }}</text>
          <text class="match-detail">🕒 {{ formatDate(match.startTime) }}</text>
          <text class="match-status" :class="match.status">{{ match.status }}</text>
        </view>
      </view>
    </view>

    <view class="fab" @click="goToCreate">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMatches } from '../../api';

const matches = ref<any[]>([]);

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

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};

onMounted(() => {
  fetchMatches();
});
</script>

<style>
.container { padding: 20px; }
.header { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: bold; }
.match-card { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.match-name { font-size: 18px; font-weight: bold; display: block; margin-bottom: 5px; }
.match-detail { color: #666; font-size: 14px; display: block; }
.match-status { margin-top: 5px; font-size: 12px; padding: 2px 6px; border-radius: 4px; background: #eee; display: inline-block; }
.match-status.PENDING { background: #e3f2fd; color: #1976d2; }
.match-status.COMPLETED { background: #e8f5e9; color: #2e7d32; }
.fab { position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; background: #2e7d32; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
.fab-icon { color: white; font-size: 30px; }
</style>
