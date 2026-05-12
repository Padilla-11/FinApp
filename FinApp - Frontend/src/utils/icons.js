import {
  ChartBarIcon, ClockIcon, CalendarDaysIcon, CreditCardIcon,
  CalculatorIcon, Cog6ToothIcon, SparklesIcon,
  ArchiveBoxIcon, BanknotesIcon, CurrencyDollarIcon,
  UserGroupIcon, TagIcon, CheckCircleIcon, XCircleIcon,
  ClipboardDocumentListIcon, LockClosedIcon, ExclamationTriangleIcon,
  InformationCircleIcon, CubeIcon, BuildingLibraryIcon,
  ScaleIcon, FaceFrownIcon, MapPinIcon,
} from '@heroicons/react/20/solid';

export const MOV_ICONS = {
  gasto_operativo:        { Icon: BanknotesIcon, cls: 'gasto' },
  compra_mercancia:       { Icon: CubeIcon, cls: 'compra' },
  ingreso_no_operativo:   { Icon: CurrencyDollarIcon, cls: 'ingreso' },
  retiro_dueno:           { Icon: BuildingLibraryIcon, cls: 'retiro' },
  cobro_cuenta_por_cobrar:{ Icon: BanknotesIcon, cls: 'cobro' },
};

export const SIDEBAR_ICONS = {
  dashboard:     ChartBarIcon,
  jornada:       ClockIcon,
  historial:     CalendarDaysIcon,
  cuentas:       CreditCardIcon,
  simulador:     CalculatorIcon,
  analisis:      SparklesIcon,
  configuracion: Cog6ToothIcon,
};

export const EMPTY_ICONS = {
  box:       CubeIcon,
  money:     BanknotesIcon,
  users:     UserGroupIcon,
  tag:       TagIcon,
  calendar:  CalendarDaysIcon,
  check:     CheckCircleIcon,
  error:     XCircleIcon,
  clipboard: ClipboardDocumentListIcon,
  lock:      LockClosedIcon,
  clock:     ClockIcon,
  card:      CreditCardIcon,
  chart:     ChartBarIcon,
  docs:      ArchiveBoxIcon,
  sad:       FaceFrownIcon,
};
