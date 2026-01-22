<template>
  <view class="container">
    <view class="order-detail" v-if="order">
      <view class="info-card first-card">
        <view class="info-row">
            <text class="label">比赛名称</text>
            <text class="value highlight-name">{{ order.tournament?.name }}</text>
        </view>
        <view class="divider"></view>
        <view class="info-row">
            <text class="label">比赛时间</text>
            <text class="value">{{ formatDate(order.tournament?.startTime) }}</text>
        </view>
        <view class="info-row">
            <text class="label vertical-top">比赛地点</text>
            <text class="value">{{ order.tournament?.location }}</text>
        </view>
        <view class="divider"></view>
        <view class="info-row">
            <text class="label">参赛人员</text>
            <text class="value">{{ order.player?.name }}</text>
        </view>
        <view class="info-row">
            <text class="label">联系电话</text>
            <text class="value">{{ order.player?.phone || '-' }}</text>
        </view>
        <view class="divider"></view>
        <view class="info-row">
            <text class="label">备注信息</text>
            <text class="value">-</text>
        </view>
        <view class="divider"></view>
        <view class="info-row">
            <text class="label">参赛资料</text>
            <text class="value">-</text>
        </view>
      </view>

      <view class="info-card">
        <view class="info-row">
          <text class="label">订单编号</text>
          <text class="value">{{ order.orderNo }}</text>
        </view>
        <view class="divider"></view>
        <view class="info-row">
          <text class="label">订单时间</text>
          <text class="value">{{ formatDate(order.createdAt) }}</text>
        </view>
        <view class="divider"></view>
        <view class="info-row">
          <text class="label">订单状态</text>
          <text class="value status-text" :class="order.status">{{ getStatusText(order.status) }}</text>
        </view>
        <view class="divider"></view>
        <view class="info-row">
          <text class="label">报名费用</text>
          <text class="value price">￥{{ order.amount }}</text>
        </view>
      </view>

      <view class="footer-actions" v-if="order.status === 'PENDING'">
        <button class="btn-cancel" @click="handleCancel">取消订单</button>
        <button class="btn-pay" @click="handlePay">立即支付</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { payOrder, cancelOrder } from '../../api';

const order = ref<any>(null);

onLoad((options: any) => {
  if (options.data) {
    try {
      order.value = JSON.parse(decodeURIComponent(options.data));
    } catch (e) {
      console.error('Failed to parse order data', e);
      uni.showToast({ title: '参数错误', icon: 'none' });
    }
  }
});

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
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')} ${weekDay}`;
};

const handlePay = async () => {
    try {
        uni.showLoading({ title: '发起支付...' });
        const paymentRes: any = await payOrder(order.value.orderNo);
        
        if (paymentRes.isSimulation) {
            uni.showToast({ title: '模拟支付成功', icon: 'none' });
            order.value.status = 'PAID';
        } else if (paymentRes.paymentParams) {
            const params = paymentRes.paymentParams;
            await new Promise((resolve, reject) => {
                uni.requestPayment({
                    provider: 'wxpay',
                    timeStamp: params.timeStamp,
                    nonceStr: params.nonceStr,
                    package: params.package,
                    signType: params.signType,
                    paySign: params.paySign,
                    success: resolve,
                    fail: reject
                });
            });
            uni.showToast({ title: '支付成功' });
            order.value.status = 'PAID';
        }
        setTimeout(() => uni.navigateBack(), 1500);
    } catch (err: any) {
        console.error(err);
        uni.showToast({ title: err.errMsg || '支付失败', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

const handleCancel = async () => {
    uni.showModal({
        title: '提示',
        content: '确定要取消该订单吗？',
        success: async (res: any) => {
            if (res.confirm) {
                try {
                    uni.showLoading({ title: '处理中...' });
                    await cancelOrder(order.value.orderNo);
                    uni.showToast({ title: '订单已取消' });
                    order.value.status = 'CANCELLED';
                    setTimeout(() => uni.navigateBack(), 1500);
                } catch (err: any) {
                    uni.showToast({ title: err.message || '取消失败', icon: 'none' });
                } finally {
                    uni.hideLoading();
                }
            }
        }
    });
};
</script>

<style>
.container { padding: 15px; background: #f5f5f5; min-height: 100vh; }

.info-card { background: white; padding: 0 15px; border-radius: 8px; margin-bottom: 15px; }
.first-card { padding-top: 15px; padding-bottom: 15px; }

.info-row { display: flex; padding: 12px 0; font-size: 14px; align-items: center; justify-content: space-between; }
.label { color: #999; width: 80px; }
.value { flex: 1; color: #333; text-align: right; }
.vertical-top { align-self: flex-start; }

.divider { height: 1px; background: #f5f5f5; width: 100%; }

.highlight-name { color: #9c27b0; font-weight: bold; text-decoration: underline; }
.status-text.PENDING { color: #ef6c00; }
.status-text.PAID { color: #2e7d32; }
.status-text.REFUNDED { color: #999; }
.price { color: #2e7d32; font-weight: bold; }

.footer-actions { position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 15px; display: flex; gap: 15px; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); }
.btn-cancel { flex: 1; background: #f5f5f5; color: #666; font-size: 14px; border-radius: 20px; border: none; }
.btn-pay { flex: 1; background: #3A5F0B; color: white; font-size: 14px; border-radius: 20px; border: none; }
</style>
