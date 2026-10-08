/**
 * OMNIVOID LABS - Admin Documents API
 * 
 * GET /api/admin/documents - List all documents
 * POST /api/admin/documents - Create new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';

// GET /api/admin/documents - List all documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const editionId = searchParams.get('editionId');
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    const where: any = {};

    if (editionId) {
      where.editionId = editionId;
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        edition: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/admin/documents - Create new document
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      editionId,
      title,
      slug,
      type,
      content,
      excerpt,
      fileUrl,
      fileName,
      thumbnailUrl,
      isFeatured,
      sortOrder,
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Document type is required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        editionId: editionId || null,
        title,
        slug: slug || null,
        type,
        content,
        excerpt: excerpt || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        thumbnailUrl: thumbnailUrl || null,
        isFeatured: isFeatured || false,
        sortOrder: sortOrder || 0,
      },
      include: {
        edition: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document created successfully',
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create document' },
      { status: 500 }
    );
  }
}