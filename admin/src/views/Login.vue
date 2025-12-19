<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2>Tennis Land Admin</h2>
      </template>
      <el-form :model="form" label-width="80px">
        <el-form-item label="Username">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="Password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading">Login</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const form = ref({
  username: '',
  password: ''
})
const loading = ref(false)

// Use backend URL. In dev, we might need proxy or CORS.
// Assuming backend runs on port 3000 locally or configured via env
const API_URL = 'http://localhost:3000/api' // Adjust as needed

const handleLogin = async () => {
  loading.value = true
  try {
    const res = await axios.post(`${API_URL}/admin/login`, form.value)
    localStorage.setItem('adminToken', res.data.token)
    ElMessage.success('Login successful')
    router.push('/')
  } catch (err) {
    ElMessage.error('Login failed')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}
.login-card {
  width: 400px;
}
</style>
