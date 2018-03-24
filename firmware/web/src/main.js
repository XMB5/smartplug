// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import Vuex from 'vuex'
import App from './App'
import BootstrapVue from 'bootstrap-vue'
import Icon from 'vue-awesome/components/Icon'
import router from './router'
import Rpc from './plugins/rpc'
import { mergeDeep } from './helpers/mergeDeep.js'

Vue.config.productionTip = false

// bootstrap
Vue.use(BootstrapVue)

// vue-awesome icon component
Vue.component('icon', Icon)

const now = new Date()
const dataLength = 60

// Vuex state management
Vue.use(Vuex)
const store = new Vuex.Store({
  state: {
    wattage: Array(dataLength).fill(now.getTime()).map((v, i) => {
      return [
        v - (dataLength - i) * 1000,
        null
      ]
    }),
    data: {
      relay: null,
      sys: { },
      test: { }
    }
  },
  getters: {
    rpcConnected () {
      return Boolean(Vue.rpc.connected)
    }
  },
  mutations: {
    stateNew (state, results) {
      Object.assign(state.data, results)
    },
    stateUpdate (state, results) {
      mergeDeep(state.data, results)
    },
    wattage (state, power) {
      state.wattage = [
        ...state.wattage.slice(1),
        [ new Date(), power ]
      ]
    }
  },
  actions: {
    relay (context, state) {
      return Vue.rpc.request('relay', state)
    },
    test (/* context */) {
      return Vue.rpc.request('test')
    }
  }
})

// WebSocket RPC
Vue.use(Rpc, '/api/v1')
Vue.rpc.on('connect', (state) => {
  store.commit('stateNew', state)
})
Vue.rpc.on('disconnect', () => {
  // console.log(store, store.rpcConnected, Vue.rpc.connected)
})
Vue.rpc.on('update', (state) => {
  store.commit('stateUpdate', state)
})

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  components: { App },
  template: '<App/>',
  mounted () {
    this.timerId_ = setInterval(() => {
      if (Vue.rpc.connected) {
        const power = store.state.data.power
        if (typeof power !== 'undefined') {
          store.commit('wattage', power)
        }
      }
    }, 1000)
  },
  beforeDestroy () {
    if (this.timerId_) clearInterval(this.timerId_)
  }
})
