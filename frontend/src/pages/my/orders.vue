<template>
  <view class="container">
    <!-- Tabs -->
    <view class="tabs">
      <view class="tab-item" :class="{ active: currentTab === '' }" @click="switchTab('')">全部</view>
      <view class="tab-item" :class="{ active: currentTab === 'PENDING' }" @click="switchTab('PENDING')">待支付</view>
      <view class="tab-item" :class="{ active: currentTab === 'PAID' }" @click="switchTab('PAID')">已支付</view>
    </view>

    <view class="order-list">
      <view class="order-item" v-for="order in filteredOrders" :key="order.id" @click="goToDetail(order)">
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
      
      <view v-if="filteredOrders.length === 0" class="empty-tip">
        <text>暂无{{ getStatusText(currentTab) }}订单记录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { getMyOrders } from '../../api';

const orders = ref<any[]>([]);
const currentTab = ref('');

onLoad((options: any) => {
  if (options.status) {
    currentTab.value = options.status;
  }
});

onShow(() => {
    fetchOrders();
});

const fetchOrders = async () => {
  uni.showLoading({ title: '加载中...' });
  try {
    const res: any = await getMyOrders();
    orders.value = res;
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const switchTab = (tab: string) => {
  currentTab.value = tab;
};

const filteredOrders = computed(() => {
  if (!currentTab.value) return orders.value;
  return orders.value.filter(o => o.status === currentTab.value);
});

const goToDetail = (order: any) => {
    // Only allow navigation to detail for PENDING orders to pay/cancel
    // Or maybe for all orders to see details? Let's allow for all.
    uni.navigateTo({ url: `/pages/my/order-detail?data=${encodeURIComponent(JSON.stringify(order))}` });
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'PENDING': '待支付',
    'PAID': '已支付',
    'CANCELLED': '已取消',
    'REFUNDED': '已退款'
  };
  return map[status] || status;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
};
</script>

<style>
.container { padding: 0; background: #f5f5f5; min-height: 100vh; }
.tabs { display: flex; background: white; padding: 10px 0; margin-bottom: 10px; position: sticky; top: 0; z-index: 10; }
.tab-item { flex: 1; text-align: center; font-size: 14px; color: #666; padding-bottom: 8px; border-bottom: 2px solid transparent; }
.tab-item.active { color: #3A5F0B; border-bottom-color: #3A5F0B; font-weight: bold; }

.order-list { padding: 15px; }
.order-item { background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
.order-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; font-size: 12px; color: #666; }
.order-status { font-weight: bold; }
.order-status.PAID { color: #2e7d32; }
.order-status.PENDING { color: #ef6c00; }
.order-status.REFUNDED { color: #999; text-decoration: line-through; }
.order-content { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.match-name { font-size: 16px; font-weight: bold; color: #333; }
.order-amount { font-size: 18px; color: #d32f2f; font-weight: bold; }
.order-footer { text-align: right; font-size: 12px; color: #999; }
.empty-tip { text-align: center; margin-top: 50px; color: #999; }
</style>