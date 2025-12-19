<template>
  <view class="container">
    <view class="form-group">
      <text class="label">赛事名称</text>
      <input class="input" v-model="form.name" placeholder="例如：周日公开赛" placeholder-style="z-index: 0" />
    </view>
    
    <view class="form-group">
      <text class="label">地点</text>
      <input class="input" v-model="form.location" placeholder="例如：1号场" placeholder-style="z-index: 0" />
    </view>
    
    <view class="form-group">
      <text class="label">比赛时间</text>
      <picker mode="date" :value="form.date" start="2025-01-01" end="2030-12-31" @change="bindDateChange">
        <view class="picker-view">
          {{ form.date || '请选择日期' }}
        </view>
      </picker>
      <picker mode="time" :value="form.time" start="00:00" end="23:59" @change="bindTimeChange" style="margin-top: 10px;">
        <view class="picker-view">
          {{ form.time || '请选择时间' }}
        </view>
      </picker>
    </view>

    <view class="form-group">
      <text class="label">报名开始时间</text>
      <picker mode="date" :value="form.regStartDate" start="2025-01-01" end="2030-12-31" @change="bindRegStartDateChange">
        <view class="picker-view">
          {{ form.regStartDate || '请选择日期' }}
        </view>
      </picker>
      <picker mode="time" :value="form.regStartTime" start="00:00" end="23:59" @change="bindRegStartTimeChange" style="margin-top: 10px;">
        <view class="picker-view">
          {{ form.regStartTime || '请选择时间' }}
        </view>
      </picker>
    </view>

    <view class="form-group">
      <text class="label">报名截止时间</text>
      <picker mode="date" :value="form.regEndDate" start="2025-01-01" end="2030-12-31" @change="bindRegEndDateChange">
        <view class="picker-view">
          {{ form.regEndDate || '请选择日期' }}
        </view>
      </picker>
      <picker mode="time" :value="form.regEndTime" start="00:00" end="23:59" @change="bindRegEndTimeChange" style="margin-top: 10px;">
        <view class="picker-view">
          {{ form.regEndTime || '请选择时间' }}
        </view>
      </picker>
    </view>

    <view class="form-group">
      <text class="label">规则</text>
      <textarea class="textarea" v-model="form.rules" placeholder="规则描述..." />
    </view>

    <button class="btn-submit" @click="submit">创建赛事</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createMatch } from '../../api';

const form = ref({
  name: '',
  location: '',
  date: '',
  time: '',
  regStartDate: '',
  regStartTime: '',
  regEndDate: '',
  regEndTime: '',
  rules: '',
  description: ''
});

const bindDateChange = (e: any) => {
  form.value.date = e.detail.value;
};

const bindTimeChange = (e: any) => {
  form.value.time = e.detail.value;
};

const bindRegStartDateChange = (e: any) => {
  form.value.regStartDate = e.detail.value;
};

const bindRegStartTimeChange = (e: any) => {
  form.value.regStartTime = e.detail.value;
};

const bindRegEndDateChange = (e: any) => {
  form.value.regEndDate = e.detail.value;
};

const bindRegEndTimeChange = (e: any) => {
  form.value.regEndTime = e.detail.value;
};

const submit = async () => {
  /**
   * 提交赛事创建
   * 1. 组合日期和时间
   * 2. 调用创建赛事 API
   * 3. 成功后返回上一页
   */
  try {
    const startTime = `${form.value.date}T${form.value.time}:00`;
    const registrationStart = form.value.regStartDate && form.value.regStartTime ? `${form.value.regStartDate}T${form.value.regStartTime}:00` : undefined;
    const registrationEnd = form.value.regEndDate && form.value.regEndTime ? `${form.value.regEndDate}T${form.value.regEndTime}:00` : undefined;
    
    await createMatch({ ...form.value, startTime, registrationStart, registrationEnd });
    uni.showToast({ title: '赛事已创建' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err) {
    uni.showToast({ title: '错误', icon: 'none' });
  }
};
</script>

<style>
.container { padding: 20px; }
.form-group { margin-bottom: 15px; }
.label { display: block; margin-bottom: 5px; font-weight: bold; }
.input { width: 100%; height: 44px; padding: 0 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.picker-view { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background: #fff; }
.textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.btn-submit { background: #2e7d32; color: white; padding: 12px; border-radius: 4px; text-align: center; margin-top: 20px; }
</style>
