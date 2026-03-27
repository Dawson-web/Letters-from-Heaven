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
    backgroundColor: '#F4EFE6',
    backgroundColorTop: '#F4EFE6',
    backgroundColorBottom: '#F4EFE6',
    navigationBarBackgroundColor: '#F4EFE6',
    navigationBarTitleText: '云端回信',
    navigationBarTextStyle: 'black'
  }
})
