<template>
  <view 
    class="tennis-ball" 
    :class="{ 'animate-bounce': animated }"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <view class="line line-1"></view>
    <view class="line line-2"></view>
  </view>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps({
  size: {
    type: Number,
    default: 48
  },
  animated: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.tennis-ball {
  background-color: #FFD700; /* 网球黄 */
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  box-shadow: inset -2px -2px 6px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.2);
  display: inline-block;
}

/* 网球的白色曲线 */
.line {
  position: absolute;
  background-color: transparent;
  border: 2px solid #fff;
  border-radius: 50%;
}

/* 左侧曲线 */
.line-1 {
  width: 70%;
  height: 70%;
  top: 15%;
  left: -35%;
  border-right: none;
  border-top: none;
  border-bottom: none;
  transform: rotate(-45deg);
  border-width: 3px;
}

/* 右侧曲线 */
.line-2 {
  width: 70%;
  height: 70%;
  top: 15%;
  right: -35%;
  border-left: none;
  border-top: none;
  border-bottom: none;
  transform: rotate(45deg);
  border-width: 3px;
}

/* 弹跳动画 */
.animate-bounce {
  animation: bounce 1s infinite alternate cubic-bezier(0.5, 0.05, 1, 0.5);
}

@keyframes bounce {
  from {
    transform: translateY(0) scaleY(1);
  }
  to {
    transform: translateY(-20px) scaleY(1.1); /* 向上弹起 */
  }
}
</style>
