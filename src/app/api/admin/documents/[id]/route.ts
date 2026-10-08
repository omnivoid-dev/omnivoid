/**
 * OMNIVOID LABS - Admin Document Specific API
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
    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch document' }, { status: 500 });
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
    const before = await prisma.document.findUnique({ where: { id: params.id }, select: { fileUrl: true, thumbnailUrl: true } });
    const document = await prisma.document.update({
      where: { id: params.id },
      data: body,
    });
    // Replaced or removed files are purged once nothing references them
    await deleteIfUnreferenced([before?.fileUrl, before?.thumbnailUrl]);

    return NextResponse.json({ success: true, data: document, message: 'Document updated successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const before = await prisma.document.findUnique({ where: { id: params.id }, select: { fileUrl: true, thumbnailUrl: true } });
    await prisma.document.delete({ where: { id: params.id } });
    await deleteIfUnreferenced([before?.fileUrl, before?.thumbnailUrl]);
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete document' }, { status: 500 });
  }
}
