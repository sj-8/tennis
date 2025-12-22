<template>
  <view class="container">
    <view class="header">
      <text class="title">参赛选手名单</text>
    </view>

    <view v-if="participants.length === 0" class="empty-tip">
      <text>暂无报名人员</text>
    </view>

    <view class="participant-list">
      <view v-for="(p, index) in participants" :key="p.id" class="participant-item">
        <text class="index">{{ index + 1 }}</text>
        <view class="avatar-placeholder">{{ p.name[0] }}</view>
        <text class="name">{{ p.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getMatchParticipants } from '../../api';

const participants = ref<any[]>([]);

onLoad((options: any) => {
  if (options.id) {
    fetchParticipants(Number(options.id));
  }
});

const fetchParticipants = async (id: number) => {
  /**
   * 获取参赛选手名单
   * 调用 API 获取指定赛事的已审核通过选手
   */
  try {
    const res = await getMatchParticipants(id);
    participants.value = res as any[];
  } catch (err) {
    console.error(err);
  }
};
</script>

<style>
.container { padding: 20px; }
.header { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.title { font-size: 18px; font-weight: bold; }
.participant-list { background: #fff; border-radius: 8px; overflow: hidden; }
.participant-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f5f5f5; }
.participant-item:last-child { border-bottom: none; }
.index { width: 30px; color: #999; font-weight: bold; }
.avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; background-color: #f0f0f0; }
.avatar-placeholder { width: 40px; height: 40px; background: #e0e0e0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; color: #666; font-size: 16px; font-weight: bold; }
.name { font-size: 16px; color: #333; }
.empty-tip { text-align: center; padding: 40px; color: #999; }
</style>
