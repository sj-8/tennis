<template>
  <view class="container">
    <view class="header">
      <text class="title">裁判管理</text>
      <text class="subtitle">管理本场赛事的裁判人员</text>
    </view>

    <view class="add-box">
      <input class="input" v-model="identifier" placeholder="请输入用户 OpenID 或 身份证号" />
      <button class="btn-add" @click="handleAdd" :disabled="!identifier">添加裁判</button>
    </view>

    <view class="list">
      <view class="list-title">当前裁判列表 ({{ referees.length }})</view>
      
      <view class="item" v-for="referee in referees" :key="referee.id">
        <image class="avatar" :src="referee.avatar || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="info">
          <text class="name">{{ referee.name || referee.realName || '未知用户' }}</text>
          <text class="sub">{{ referee.phone || '无联系方式' }}</text>
        </view>
        <view class="action" @click="handleRemove(referee)">
          <text class="btn-remove">移除</text>
        </view>
      </view>
      
      <view v-if="referees.length === 0" class="empty">暂无裁判</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getReferees, addReferee, removeReferee } from '../../api';

const matchId = ref(0);
const referees = ref<any[]>([]);
const identifier = ref('');

onLoad((options: any) => {
  if (options.id) {
    matchId.value = Number(options.id);
    fetchReferees();
  }
});

const fetchReferees = async () => {
  try {
    const res: any = await getReferees(matchId.value);
    referees.value = res;
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const handleAdd = async () => {
  if (!identifier.value) return;
  
  uni.showLoading({ title: '添加中...' });
  try {
    await addReferee(matchId.value, identifier.value);
    
    identifier.value = '';
    fetchReferees();
    uni.showToast({ title: '添加成功' });
  } catch (err) {
    uni.showToast({ title: '添加失败，用户可能不存在', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const handleRemove = (referee: any) => {
  uni.showModal({
    title: '确认移除',
    content: `确定移除裁判 ${referee.name}?`,
    success: async (res: any) => {
      if (res.confirm) {
        try {
          await removeReferee(matchId.value, referee.id);
          fetchReferees();
          uni.showToast({ title: '已移除' });
        } catch (err) {
          uni.showToast({ title: '移除失败', icon: 'none' });
        }
      }
    }
  });
};
</script>

<style>
.container { padding: 20px; background: #f5f5f5; min-height: 100vh; }
.header { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: bold; display: block; color: #333; }
.subtitle { font-size: 14px; color: #999; }

.add-box { background: white; padding: 15px; border-radius: 8px; display: flex; gap: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.input { flex: 1; border: 1px solid #ddd; padding: 0 10px; height: 40px; border-radius: 4px; font-size: 14px; }
.btn-add { background: #3A5F0B; color: white; font-size: 14px; padding: 0 15px; height: 40px; line-height: 40px; border-radius: 4px; margin: 0; }
.btn-add[disabled] { background: #ccc; }

.list { background: white; border-radius: 8px; padding: 0 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.list-title { padding: 15px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333; }
.item { display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0; }
.item:last-child { border-bottom: none; }
.avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; background: #eee; }
.info { flex: 1; }
.name { font-size: 16px; font-weight: bold; display: block; }
.sub { font-size: 12px; color: #999; }
.btn-remove { color: #ff3b30; font-size: 14px; padding: 5px 10px; }
.empty { text-align: center; padding: 30px; color: #999; }
</style>