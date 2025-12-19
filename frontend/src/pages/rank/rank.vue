<template>
  <view class="container">
    <text class="title">选手排行榜</text>
    
    <view class="rank-list">
      <view class="rank-header">
        <text class="col rank">排名</text>
        <text class="col name">选手</text>
        <text class="col points">积分</text>
      </view>
      
      <view v-for="(player, index) in players" :key="player.id" class="rank-item">
        <text class="col rank">{{ index + 1 }}</text>
        <text class="col name">{{ player.name || '未知' }}</text>
        <text class="col points">{{ player.points }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getRankings } from '../../api';

const players = ref<any[]>([]);

const fetchRankings = async () => {
  try {
    const res = await getRankings();
    players.value = res as any[];
  } catch (err) {
    console.error(err);
  }
};

onMounted(() => {
  fetchRankings();
});
</script>

<style>
.container { padding: 20px; }
.title { font-size: 24px; font-weight: bold; margin-bottom: 20px; display: block; }
.rank-header { display: flex; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
.rank-item { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
.col { flex: 1; }
.col.rank { flex: 0 0 50px; font-weight: bold; color: #666; }
.col.points { text-align: right; font-weight: bold; color: #2e7d32; }
</style>
