export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/write/index',
    'pages/sent/index',
    'pages/inbox/index',
    'pages/reply/index',
    'pages/profile/index',
    'pages/memorial/index',
    'pages/memorial-edit/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    backgroundColor: '#F6F4F0',
    navigationBarBackgroundColor: '#F6F4F0',
    navigationBarTitleText: '云端回信',
    navigationBarTextStyle: 'black'
  }
})
