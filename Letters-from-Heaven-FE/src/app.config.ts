export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
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
  },
  tabBar: {
    color: '#5E6E7B',
    selectedColor: '#C85A58',
    backgroundColor: '#FFFDF8',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/write/index',
        text: '写信',
        iconPath: 'assets/tabbar/write.png',
        selectedIconPath: 'assets/tabbar/write-active.png'
      },
      {
        pagePath: 'pages/inbox/index',
        text: '收件箱',
        iconPath: 'assets/tabbar/inbox.png',
        selectedIconPath: 'assets/tabbar/inbox-active.png'
      },
      {
        pagePath: 'pages/memorial/index',
        text: '档案',
        iconPath: 'assets/tabbar/memorial.png',
        selectedIconPath: 'assets/tabbar/memorial-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/profile.png',
        selectedIconPath: 'assets/tabbar/profile-active.png'
      }
    ]
  }
})
