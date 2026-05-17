import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Joyride, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { completeOnboardingThunk } from '../../redux/authSlice';
import { tourFinished } from '../../redux/onboardingSlice';

const STEPS = [
  {
    target: 'body',
    placement: 'center',
    title: '👋 Chào mừng đến với TaskFlow!',
    content: 'Hãy cùng khám phá các tính năng chính trong khoảng 1 phút nhé.',
    disableBeacon: true,
    route: '/',
  },
  {
    target: '.stat-card',
    title: '📊 Thống kê công việc',
    content: 'Đây là tổng quan công việc của bạn: tổng số task, số đang làm, đã hoàn thành và tỷ lệ hoàn thành.',
    disableBeacon: true,
    route: '/',
  },
  {
    target: '.sidebar-item',
    title: '🗂 Danh mục',
    content: 'Sidebar giúp bạn lọc nhanh task theo danh mục: Công việc, Cá nhân, Sức khỏe, Học tập, Mua sắm.',
    disableBeacon: true,
    placement: 'right',
    route: '/',
  },
  {
    target: '.theme-toggle',
    title: '🌗 Đổi giao diện',
    content: 'Bấm vào đây để đổi giữa giao diện sáng và tối.',
    disableBeacon: true,
    route: '/',
  },
  {
    target: '.navbar-link[href="/tasks"]',
    title: '📋 Quản lý task',
    content: 'Bấm "Next" để chuyển sang trang Tasks — nơi bạn tạo, sửa và quản lý toàn bộ công việc.',
    disableBeacon: true,
    route: '/',
  },
  {
    target: '.task-input-form',
    title: '✍️ Tạo task mới',
    content: 'Nhập tiêu đề, chọn mức ưu tiên và danh mục, sau đó bấm thêm để tạo task.',
    disableBeacon: true,
    route: '/tasks',
  },
  {
    target: '.search-input',
    title: '🔍 Tìm kiếm & lọc',
    content: 'Tìm task theo từ khóa hoặc lọc theo mức ưu tiên.',
    disableBeacon: true,
    route: '/tasks',
  },
  {
    target: '.task-card',
    title: '✅ Thao tác với task',
    content: 'Bấm checkbox để hoàn thành, hoặc dùng các nút bên phải để sửa, xóa task.',
    disableBeacon: true,
    route: '/tasks',
  },
  {
    target: 'body',
    placement: 'center',
    title: '🎉 Xong rồi!',
    content: 'Bạn đã sẵn sàng sử dụng TaskFlow. Có thể xem lại hướng dẫn này bất cứ lúc nào ở mục Cài đặt.',
    disableBeacon: true,
    route: '/tasks',
  },
];

const LOCALE_VI = {
  back: 'Quay lại',
  close: 'Đóng',
  last: 'Hoàn thành',
  next: 'Tiếp theo',
  skip: 'Bỏ qua',
};

export default function OnboardingTour() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const forceStart = useSelector((s) => s.onboarding.forceStart);

  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastForceStart, setLastForceStart] = useState(forceStart);

  if (forceStart && !lastForceStart) {
    setStepIndex(0);
    setCompleted(false);
    setPaused(false);
    setLastForceStart(true);
  } else if (!forceStart && lastForceStart) {
    setLastForceStart(false);
  }

  const shouldRun = useMemo(() => {
    if (!user) return false;
    if (completed) return false;
    return forceStart || !user.onboardingCompleted;
  }, [user, forceStart, completed]);

  useEffect(() => {
    if (shouldRun && location.pathname !== '/' && stepIndex === 0) {
      navigate('/', { replace: true });
    }
  }, [shouldRun, location.pathname, stepIndex, navigate]);

  useEffect(() => {
    if (!shouldRun) return undefined;
    const t = setTimeout(() => setDelayElapsed(true), 300);
    return () => clearTimeout(t);
  }, [shouldRun]);

  const run = shouldRun && delayElapsed && !paused;

  const finish = () => {
    setCompleted(true);
    if (user && !user.onboardingCompleted) {
      dispatch(completeOnboardingThunk());
    }
    dispatch(tourFinished());
  };

  const handleCallback = (data) => {
    const { status, action, index, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finish();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      if (nextIndex < 0 || nextIndex >= STEPS.length) {
        finish();
        return;
      }
      const nextStep = STEPS[nextIndex];
      const needsRouteChange = nextStep.route && nextStep.route !== location.pathname;

      if (needsRouteChange) {
        setPaused(true);
        navigate(nextStep.route);
        setStepIndex(nextIndex);
        setTimeout(() => setPaused(false), 500);
      } else {
        setStepIndex(nextIndex);
      }
    }
  };

  if (!shouldRun) return null;

  return (
    <Joyride
      steps={STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      locale={LOCALE_VI}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: 'var(--accent, #6366f1)',
          zIndex: 10000,
          arrowColor: 'var(--bg-elevated, #ffffff)',
          backgroundColor: 'var(--bg-elevated, #ffffff)',
          textColor: 'var(--text-primary, #111827)',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        tooltipTitle: { fontSize: '1.05rem', fontWeight: 600, marginBottom: 6 },
        buttonNext: { borderRadius: 8 },
        buttonBack: { color: 'var(--text-secondary, #6b7280)' },
      }}
    />
  );
}
