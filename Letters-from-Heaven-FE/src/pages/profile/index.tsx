import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoNotice } from '@/components/arco/notice';
import { SectionHeading } from '@/components/arco/section-heading';
import { PageShell } from '@/components/layout/page-shell';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';

const ProfilePage = observer(() => {
  const { mailboxStore } = useRootStore();

  const handleClearDraft = () => {
    mailboxStore.clearDraft();
    Taro.showToast({ title: '草稿已清空', icon: 'none' });
  };

  const handleReset = () => {
    Taro.showModal({
      title: '清空信箱数据',
      content: '这会删除当前账号下的草稿、信件与回响记录，无法恢复。',
      success: (result) => {
        if (result.confirm) {
          void mailboxStore
            .resetAll()
            .then(() => {
              Taro.showToast({ title: '已清空', icon: 'none' });
            })
            .catch((error) => {
              Taro.showToast({
                title: getErrorMessage(error),
                icon: 'none',
              });
            });
        }
      },
    });
  };

  return (
    <PageShell
      eyebrow='信箱管理'
      title='我的'
      subtitle='这里保留当前信箱的统计、边界说明和数据清理操作。'
    >
      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='当前信箱'
          title='把状态和操作都收拢到一个安静的面板里'
          description='这页不再承担营销式介绍，只保留真正和信箱运行有关的信息。'
        />

        <View className='mt-6 metric-cluster'>
          <View className='metric-tile'>
            <Text className='metric-label'>信件数</Text>
            <Text className='metric-value stat-number'>{mailboxStore.letters.length}</Text>
            <Text className='metric-caption'>已经寄出的全部信件。</Text>
          </View>

          <View className='metric-tile'>
            <Text className='metric-label'>草稿</Text>
            <Text className='metric-value stat-number'>{mailboxStore.draft.body ? '1' : '0'}</Text>
            <Text className='metric-caption'>仍然停留在草稿箱里的内容。</Text>
          </View>
        </View>
      </ArcoCard>

      <ArcoNotice
        tone='warning'
        title='体验边界'
        description='回响由 AI 生成，只用于情绪承接与纪念表达。它不代表逝者真实态度，也不建议在强烈哀伤或危机场景中作为唯一支持渠道。'
      />

      <ArcoCard tone='muted' padding='lg' delay={2}>
        <SectionHeading
          eyebrow='轻量操作'
          title='先做不会破坏体验链路的清理'
          description='草稿和历史信箱是两个不同层级的操作，不要把它们放在同一按钮里。'
        />
        <View className='mt-5 flex flex-col gap-3'>
          <ArcoButton
            variant='text'
            onClick={() => Taro.navigateTo({ url: '/pages/ai-demo/index' })}
          >
            AI 接入示例页
          </ArcoButton>
          <ArcoButton variant='text' onClick={handleClearDraft}>
            清空当前草稿
          </ArcoButton>
        </View>
      </ArcoCard>

      <ArcoCard tone='danger' padding='lg' delay={3}>
        <SectionHeading
          eyebrow='危险操作'
          title='彻底清空云端信箱'
          description='这会删除当前账号下的草稿、信件和回响记录，且无法恢复。'
        />
        <View className='mt-5'>
          <ArcoButton variant='text' className='text-terracotta' onClick={handleReset}>
            清空云端信箱
          </ArcoButton>
        </View>
      </ArcoCard>
    </PageShell>
  );
});

export default ProfilePage;
