/**
 * OMNIVOID LABS - Admin Resource Specific API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { deleteIfUnreferenced } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: params.id },
    });

    if (!resource) {
      return NextResponse.json({ success: false, error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: resource });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch resource' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    const before = await prisma.resource.findUnique({ where: { id: params.id }, select: { url: true, filePath: true, thumbnailUrl: true } });
    const resource = await prisma.resource.update({
      where: { id: params.id },
      data: body,
    });

    await deleteIfUnreferenced([before?.url, before?.filePath, before?.thumbnailUrl]);
    return NextResponse.json({ success: true, data: resource, message: 'Resource updated successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update resource' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const before = await prisma.resource.findUnique({ where: { id: params.id }, select: { url: true, filePath: true, thumbnailUrl: true } });
    await prisma.resource.delete({ where: { id: params.id } });
    await deleteIfUnreferenced([before?.url, before?.filePath, before?.thumbnailUrl]);
    return NextResponse.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete resource' }, { status: 500 });
  }
}
