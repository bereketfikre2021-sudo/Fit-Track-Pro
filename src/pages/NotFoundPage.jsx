import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell, Home } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center py-10 px-6">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-6xl font-bold text-primary mb-2">{t('notFound.code')}</p>
          <h1 className="text-xl font-semibold mb-2">{t('notFound.title')}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {t('notFound.description')}
          </p>
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              {t('notFound.backToWorkout')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotFoundPage
