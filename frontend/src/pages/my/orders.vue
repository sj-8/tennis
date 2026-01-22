<template>
  <view class="container">
    <view class="order-list">
      <view class="order-item" v-for="order in orders" :key="order.id">
        <view class="order-header">
          <text class="order-no">订单号：{{ order.orderNo }}</text>
          <text class="order-status" :class="order.status">{{ getStatusText(order.status) }}</text>
        </view>
        <view class="order-content">
          <text class="match-name">{{ order.tournament.name }}</text>
          <text class="order-amount">￥{{ order.amount }}</text>
        </view>
        <view class="order-footer">
          <text class="order-time">{{ formatDate(order.createdAt) }}</text>
        </view>
      </view>
      
      <view v-if="orders.length === 0" class="empty-tip">
        <text>暂无订单记录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMyOrders } from '../../api';

const orders = ref<any[]>([]);

onMounted(async () => {
  uni.showLoading({ title: '加载中...' });
  try {
    const res: any = await getMyOrders();
    orders.value = res;
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
});

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'PENDING': '待支付',
    'PAID': '已支付',
    'CANCELLED': '已取消'
  };
  return map[status] || status;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
};
</script>

<style>
.container { padding: 15px; background: #f5f5f5; min-height: 100vh; }
.order-item { background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
.order-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; font-size: 12px; color: #666; }
.order-status { font-weight: bold; }
.order-status.PAID { color: #2e7d32; }
.order-status.PENDING { color: #ef6c00; }
.order-content { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.match-name { font-size: 16px; font-weight: bold; color: #333; }
.order-amount { font-size: 18px; color: #d32f2f; font-weight: bold; }
.order-footer { text-align: right; font-size: 12px; color: #999; }
.empty-tip { text-align: center; margin-top: 50px; color: #999; }
</style>