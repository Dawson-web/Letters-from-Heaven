import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { SectionHeading } from '@/components/arco/section-heading';
import { PageShell } from '@/components/layout/page-shell';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';

const ProfilePage = observer(() => {
  const { mailboxStore } = useRootStore();

  const handleClearDraft = () => {
    mailboxStore.clearDraft();
    Taro.showToast({ title: '草稿已经清空', icon: 'none' });
  };

  const handleReset = () => {
    Taro.showModal({
      title: '要清空这只信箱吗',
      content: '这会带走当前账号下的草稿、信件和回响，而且不能恢复。',
      success: (result) => {
        if (result.confirm) {
          void mailboxStore
            .resetAll()
            .then(() => {
              Taro.showToast({ title: '信箱已经清空', icon: 'none' });
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
      subtitle='这里放着这只信箱的近况、边界提醒，以及几项需要你亲自决定的整理操作。'
    >
      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='当前信箱'
          title='把这只信箱最近的状态收在这里'
          description='你可以在这里看看已经寄出的信、暂存的草稿，以及该保留或该清理的东西。'
        />

        <View className='mt-6 metric-cluster'>
          <View className='metric-tile'>
            <Text className='metric-label'>信件数</Text>
            <Text className='metric-value stat-number'>{mailboxStore.letters.length}</Text>
            <Text className='metric-caption'>已经寄出去，留在邮路上的信。</Text>
          </View>

          <View className='metric-tile'>
            <Text className='metric-label'>草稿</Text>
            <Text className='metric-value stat-number'>{mailboxStore.draft.body ? '1' : '0'}</Text>
            <Text className='metric-caption'>还放在草稿里，等你哪天继续写。</Text>
          </View>
        </View>
      </ArcoCard>

      <ArcoCard tone='muted' padding='lg' delay={2}>
        <SectionHeading
          eyebrow='轻一点的整理'
          title='先处理那些不会把记忆一下子清空的事'
          description='如果你只是想收拾一下，先从草稿开始会更轻一些。'
        />
        <View className='mt-5 flex flex-col gap-3'>
          <ArcoButton variant='text' onClick={handleClearDraft}>
            清空当前草稿
          </ArcoButton>
        </View>
      </ArcoCard>

      <ArcoCard tone='danger' padding='lg' delay={3}>
        <SectionHeading
          eyebrow='危险操作'
          title='如果你决定告一段落，可以清空整只信箱'
          description='这会删除当前账号下的草稿、信件和回响记录，而且不能恢复。'
        />
        <View className='mt-5'>
          <ArcoButton variant='text' className='text-terracotta' onClick={handleReset}>
            清空整只信箱
          </ArcoButton>
        </View>
      </ArcoCard>
    </PageShell>
  );
});

export default ProfilePage;
