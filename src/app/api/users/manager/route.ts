// app/api/users/manager/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/database';
import bcrypt from 'bcrypt';

export const dynamic = "force-dynamic";

export const revalidate = 0;

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, name, currentPassword, newPassword } = await request.json();

    // یافتن کاربر فعلی
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // اگر رمز عبور تغییر می‌کند، بررسی رمز عبور فعلی
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }
    }

    // بررسی اینکه نام کاربری جدید تکراری نباشد (اگر تغییر کرده)
    if (username && username !== currentUser.username) {
      const userWithSameUsername = await prisma.user.findUnique({
        where: { username }
      });

      if (userWithSameUsername) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }

    // آماده سازی داده‌ها برای به روزرسانی
    const updateData: any = {
      name: name || currentUser.name,
      username: username || currentUser.username
    };

    // اگر رمز عبور جدید ارائه شده، آن را هش کرده و اضافه کنید
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // به روزرسانی کاربر
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating manager profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}