<template>
  <view class="container">
    <view class="header">
      <text class="title">录入比分</text>
    </view>

    <view v-if="participants.length === 0" class="empty-tip">
      <text>暂无参赛人员，无法录入</text>
    </view>

    <view class="player-list">
      <view v-for="(p, index) in participants" :key="p.id" class="player-item">
        <view class="info">
          <text class="name">
            {{ p.name }} 
            <text class="status-tag" v-if="p.status !== 'APPROVED'">({{ getStatusText(p.status) }})</text>
          </text>
        </view>
        <view class="action">
          <input class="rank-input" type="number" v-model="p.rank" placeholder="名次" />
          <input class="score-input" type="number" v-model="p.points" placeholder="积分" />
        </view>
      </view>
    </view>

    <button class="btn-submit" @click="submit" :loading="loading" v-if="participants.length > 0">提交成绩</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getMatchParticipants, submitResult } from '../../api';

const loading = ref(false);
const tournamentId = ref<number | null>(null);
const participants = ref<any[]>([]);

onLoad((options: any) => {
  if (options.id) {
    tournamentId.value = Number(options.id);
    fetchParticipants(tournamentId.value);
  }
});

const fetchParticipants = async (id: number) => {
  /**
   * 获取参赛选手并初始化录分表单
   * 为每个选手添加 rank 和 points 字段用于输入
   */
  try {
    const res = await getMatchParticipants(id);
    participants.value = (res as any[]).map(p => ({
      ...p,
      rank: '',
      points: ''
    }));
  } catch (err) {
    console.error(err);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const getStatusText = (status: string) => {
  const map: any = { 'PENDING': '待审核', 'WAITLIST': '候补' };
  return map[status] || status;
};

const submit = async () => {
  /**
   * 提交比赛成绩
   * 1. 过滤出有输入的选手数据
   * 2. 调用提交成绩 API
   * 3. 成功后返回上一页
   */
  loading.value = true;
  try {
    const results = participants.value
      .filter(p => p.rank || p.points)
      .map(p => ({
        playerId: p.playerId,
        rank: p.rank ? Number(p.rank) : undefined,
        bonusPoints: p.points ? Number(p.points) : undefined
      }));

    if (results.length === 0) {
      uni.showToast({ title: '请至少录入一项成绩', icon: 'none' });
      return;
    }

    await submitResult(tournamentId.value!, results);
    
    uni.showToast({ title: '成绩提交成功' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err) {
    console.error(err);
    uni.showToast({ title: '提交失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};
</script>

<style>
.container { padding: 20px; }
.header { margin-bottom: 20px; text-align: center; }
.title { font-size: 20px; font-weight: bold; }
.player-list { margin-bottom: 20px; }
.player-item { display: flex; align-items: center; justify-content: space-between; padding: 15px; border-bottom: 1px solid #eee; background: #fff; margin-bottom: 10px; border-radius: 8px; }
.name { font-size: 16px; font-weight: bold; }
.status-tag { font-size: 12px; color: #999; font-weight: normal; margin-left: 4px; }
.action { display: flex; gap: 10px; }
.rank-input, .score-input { width: 60px; height: 36px; border: 1px solid #ddd; border-radius: 4px; text-align: center; font-size: 14px; }
.btn-submit { background: #1976d2; color: white; margin-top: 20px; }
.empty-tip { text-align: center; color: #999; margin-top: 50px; }
</style>
