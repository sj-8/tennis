<template>
  <view class="container">
    <view class="header tennis-court-bg">
      <text class="title">管理裁判员</text>
      <text class="sub-title">当前赛事：{{ matchName }}</text>
    </view>

    <view class="section">
      <view class="section-title">添加裁判员</view>
      <view class="add-form">
        <input class="input" v-model="newRefereeOpenId" placeholder="请输入用户 OpenID 或 身份证号" />
        <button class="btn-add" @click="handleAdd">添加</button>
      </view>
      <text class="hint">提示：请输入用户的身份证号，或让用户在“我的”页面复制 OpenID 发送给您。</text>
    </view>

    <view class="section">
      <view class="section-title">现有裁判员</view>
      <view class="list" v-if="referees.length > 0">
        <view v-for="referee in referees" :key="referee.id" class="list-item">
          <view class="user-info">
            <image class="avatar" :src="referee.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
            <text class="name">{{ referee.name || '未知用户' }}</text>
          </view>
          <button class="btn-remove" @click="handleRemove(referee)">移除</button>
        </view>
      </view>
      <view v-else class="empty-tip">暂无裁判员</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getReferees, addReferee, removeReferee, getMatches } from '../../api';

const matchId = ref(0);
const matchName = ref('');
const referees = ref<any[]>([]);
const newRefereeOpenId = ref('');

onLoad(async (options: any) => {
  if (options.id) {
    matchId.value = Number(options.id);
    fetchReferees();
    
    // Fetch match name
    try {
        const matches: any = await getMatches();
        const match = matches.find((m: any) => m.id === matchId.value);
        if (match) matchName.value = match.name;
    } catch (e) { console.error(e); }
  }
});

const fetchReferees = async () => {
  try {
    const res = await getReferees(matchId.value);
    referees.value = res as any[];
  } catch (err) {
    uni.showToast({ title: '获取列表失败', icon: 'none' });
  }
};

const handleAdd = async () => {
  if (!newRefereeOpenId.value) {
    uni.showToast({ title: '请输入 OpenID 或 身份证号', icon: 'none' });
    return;
  }
  
  uni.showLoading({ title: '添加中...' });
  try {
    await addReferee(matchId.value, newRefereeOpenId.value);
    uni.showToast({ title: '添加成功' });
    newRefereeOpenId.value = '';
    fetchReferees();
  } catch (err: any) {
    console.error(err);
    uni.showToast({ title: err.error || '添加失败，请检查输入是否正确', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const handleRemove = async (referee: any) => {
  uni.showModal({
    title: '确认移除',
    content: `确定要移除裁判员 ${referee.name} 吗？`,
    success: async (res: any) => {
      if (res.confirm) {
        try {
          await removeReferee(matchId.value, referee.id);
          uni.showToast({ title: '移除成功' });
          fetchReferees();
        } catch (err) {
          uni.showToast({ title: '移除失败', icon: 'none' });
        }
      }
    }
  });
};
</script>

<style>
.container { padding: 0; background-color: #f5f5f5; min-height: 100vh; }
.header { padding: 30px 20px; color: white; margin-bottom: 20px; }
.title { font-size: 24px; font-weight: bold; display: block; margin-bottom: 5px; }
.sub-title { font-size: 14px; opacity: 0.9; }

.section { background: white; margin: 0 20px 20px; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; border-left: 4px solid #3A5F0B; padding-left: 10px; }

.add-form { display: flex; gap: 10px; margin-bottom: 10px; }
.input { flex: 1; border: 1px solid #ddd; padding: 0 10px; height: 40px; border-radius: 4px; }
.btn-add { background: #3A5F0B; color: white; height: 40px; line-height: 40px; font-size: 14px; padding: 0 20px; }
.hint { font-size: 12px; color: #999; }

.list-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0; }
.list-item:last-child { border-bottom: none; }
.user-info { display: flex; align-items: center; gap: 10px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #eee; }
.name { font-size: 16px; font-weight: bold; }
.btn-remove { background: #ff3b30; color: white; font-size: 12px; padding: 0 15px; height: 28px; line-height: 28px; }
.empty-tip { text-align: center; color: #999; padding: 20px; }
</style>