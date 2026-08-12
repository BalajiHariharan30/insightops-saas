import { Alert, IAlert } from './alert.model';
import { NotFoundError } from '../../utils/errors';

export async function listActiveAlerts(organizationId: string): Promise<IAlert[]> {
  return Alert.find({ organizationId, status: 'ACTIVE' })
    .sort({ createdAt: -1 })
    .exec();
}

export async function dismissAlert(organizationId: string, alertId: string): Promise<IAlert> {
  const alert = await Alert.findOne({ _id: alertId, organizationId });
  if (!alert) {
    throw new NotFoundError('Alert not found');
  }

  alert.status = 'DISMISSED';
  await alert.save();
  return alert;
}
