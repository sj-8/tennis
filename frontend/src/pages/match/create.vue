<template>
  <view class="container">
    <view class="form-group">
      <text class="label">Match Name</text>
      <input class="input" v-model="form.name" placeholder="e.g. Sunday Open" />
    </view>
    
    <view class="form-group">
      <text class="label">Location</text>
      <input class="input" v-model="form.location" placeholder="Court 1" />
    </view>
    
    <view class="form-group">
      <text class="label">Date & Time</text>
      <input class="input" v-model="form.startTime" placeholder="YYYY-MM-DD HH:mm" />
    </view>

    <view class="form-group">
      <text class="label">Rules</text>
      <textarea class="textarea" v-model="form.rules" placeholder="Description of rules..." />
    </view>

    <button class="btn-submit" @click="submit">Create Match</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createMatch } from '../../api';

const form = ref({
  name: '',
  location: '',
  startTime: '',
  rules: '',
  description: ''
});

const submit = async () => {
  try {
    await createMatch(form.value);
    uni.showToast({ title: 'Match Created' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err) {
    uni.showToast({ title: 'Error', icon: 'none' });
  }
};
</script>

<style>
.container { padding: 20px; }
.form-group { margin-bottom: 15px; }
.label { display: block; margin-bottom: 5px; font-weight: bold; }
.input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.btn-submit { background: #2e7d32; color: white; padding: 12px; border-radius: 4px; text-align: center; margin-top: 20px; }
</style>
