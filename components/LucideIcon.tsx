import { icons } from 'lucide-react-native'
import { cssInterop } from 'nativewind'
import { memo, useMemo } from 'react'

type IconName = keyof typeof icons
type IconProps = { name: IconName; className?: string; size?: number }

const LucideIcon: React.FC<IconProps> = memo(({ name, className, size }) => {
  const CustomIcon = useMemo(() => {
    const Icon = icons[name]
    Icon.displayName = name

    return cssInterop(Icon, {
      className: {
        target: 'style',
        nativeStyleToProp: {
          color: true,
          width: true,
          height: true,
        },
      },
    })
  }, [name])

  return <CustomIcon className={className} size={size} />
})

export default LucideIcon